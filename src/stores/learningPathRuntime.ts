import { computed, ref, shallowRef } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { OfflineHttpWritePayload } from "@/domain/offline/types"
import {
  buildLearningPathScormCommitRequest,
  isAssignmentLearningPathItem,
  isForumLearningPathItem,
  isQuizLearningPathItem,
  isScormLearningPathItem,
  isSurveyLearningPathItem,
  isThreadLearningPathItem,
  isSupportedLearningPathItem,
} from "@/domain/learningPaths/contracts"
import type {
  LearningPathRuntime,
  LearningPathRuntimeItem,
  LearningPathScormCommitPayload,
  LearningPathScormRuntime,
} from "@/domain/learningPaths/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import {
  LearningPathApiService,
  LearningPathServiceError,
  type LearningPathErrorCode,
} from "@/services/learningPaths/LearningPathApiService"
import {
  appendScormLaunchParameters,
  buildScormPackageScope,
  MAX_SCORM_PACKAGE_SIZE_BYTES,
  scormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHost"
import { offlineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import { isOfflineNow } from "@/services/offline/OfflineWriteSupport"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type LearningPathStatus = "idle" | "loading" | "ready" | "error"
export type LearningPathActionStatus = "idle" | "opening" | "syncing" | "restarting"
export type LearningPathContentStatus = "idle" | "loading" | "ready" | "error"
export type LearningPathStoreErrorCode =
  | LearningPathErrorCode
  | "campus_required"
  | "package_too_large"
  | "scorm_platform_unsupported"
  | "scorm_plugin_unavailable"
  | "scorm_metadata_missing"
  | "scorm_runtime_disabled"
  | "scorm_fixture_mismatch"
  | "scorm_install_failed"

interface PreparedRegularItem {
  runtime: LearningPathRuntime
  item: LearningPathRuntimeItem
  blob: Blob
}

export const useLearningPathRuntimeStore = defineStore("learningPathRuntime", () => {
  const status = ref<LearningPathStatus>("idle")
  const actionStatus = ref<LearningPathActionStatus>("idle")
  const contentStatus = ref<LearningPathContentStatus>("idle")
  const runtime = ref<LearningPathRuntime | null>(null)
  const contentBlob = shallowRef<Blob | null>(null)
  const scormEntryUrl = ref("")
  const scormSaving = ref(false)
  const offlineQueued = ref(false)
  const errorCode = ref<LearningPathStoreErrorCode | null>(null)
  const actionErrorCode = ref<LearningPathStoreErrorCode | null>(null)
  const contentErrorCode = ref<LearningPathStoreErrorCode | null>(null)

  let pendingSync: Promise<boolean> | null = null

  const currentItem = computed(
    () => runtime.value?.items.find(({ id }) => id === runtime.value?.currentItemId) ?? null,
  )
  const currentItemIsScorm = computed(() => isScormLearningPathItem(currentItem.value))
  const isBusy = computed(() => actionStatus.value !== "idle" || contentStatus.value === "loading")

  function service(): LearningPathApiService | null {
    const campus = useCampusStore().selectedCampus

    return campus ? new LearningPathApiService(createAuthenticatedHttpClient(campus)) : null
  }

  function activeIdentity(): { campusId: string; userId: number } | null {
    const campus = useCampusStore().selectedCampus
    const userId = useAuthStore().profile?.id

    return campus && userId ? { campusId: campus.id, userId } : null
  }

  function shouldUsePreparedData(): boolean {
    return isOfflineNow() || !useConnectivityStore().campusAvailable
  }

  async function loadPreparedItem(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ) {
    const identity = activeIdentity()
    if (!identity) return null

    return offlineCoreFlowRepository
      .loadLearningPathItem(identity.campusId, identity.userId, context, learningPathId, itemId)
      .catch(() => null)
  }

  async function savePreparedItem(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    activeRuntime: LearningPathRuntime,
    blob: Blob | null = null,
  ): Promise<void> {
    const identity = activeIdentity()
    if (!identity) return

    await offlineCoreFlowRepository
      .saveLearningPathItem(
        identity.campusId,
        identity.userId,
        context,
        learningPathId,
        itemId,
        activeRuntime,
        blob,
      )
      .catch(() => undefined)
  }

  async function restorePreparedStart(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
  ): Promise<boolean> {
    const prepared = await loadPreparedItem(context, learningPathId, 0)
    if (!prepared) return false

    runtime.value = structuredClone(prepared.runtime)
    status.value = "ready"
    errorCode.value = null
    const item =
      prepared.runtime.items.find(({ id }) => id === prepared.runtime.currentItemId) ?? null

    if (isSupportedLearningPathItem(item)) {
      try {
        const opened = await openPreparedItem(
          api,
          context,
          learningPathId,
          prepared.runtime.currentItemId,
        )
        if (!opened) {
          contentErrorCode.value = "unsupported"
          contentStatus.value = "error"
        }
      } catch (error) {
        contentErrorCode.value = mapError(error)
        contentStatus.value = "error"
      }
    }

    return true
  }

  function mapError(error: unknown): LearningPathStoreErrorCode {
    if (error instanceof ScormPackageHostError) {
      switch (error.code) {
        case "unsupported_platform":
          return "scorm_platform_unsupported"
        case "plugin_unavailable":
          return "scorm_plugin_unavailable"
        case "metadata_missing":
          return "scorm_metadata_missing"
        case "runtime_disabled":
          return "scorm_runtime_disabled"
        case "too_large":
          return "package_too_large"
        case "fixture_mismatch":
          return "scorm_fixture_mismatch"
        case "install_failed":
          return "scorm_install_failed"
      }
    }

    return error instanceof LearningPathServiceError ? error.code : "server"
  }

  function clearContent(): void {
    contentBlob.value = null
    scormEntryUrl.value = ""
    contentStatus.value = "idle"
    contentErrorCode.value = null
  }

  async function loadRuntime(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId?: number,
  ): Promise<LearningPathRuntime> {
    const nextRuntime = await api.getRuntime(context, learningPathId, itemId)
    runtime.value = nextRuntime

    return nextRuntime
  }

  async function prepareRegularItem(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<PreparedRegularItem | null> {
    const previewRuntime = await api.getRuntime(context, learningPathId, itemId)
    const previewItem =
      previewRuntime.items.find(({ id }) => id === previewRuntime.currentItemId) ?? null

    if (
      !previewItem ||
      !isSupportedLearningPathItem(previewItem) ||
      isScormLearningPathItem(previewItem) ||
      isQuizLearningPathItem(previewItem) ||
      isSurveyLearningPathItem(previewItem) ||
      isAssignmentLearningPathItem(previewItem) ||
      isForumLearningPathItem(previewItem) ||
      isThreadLearningPathItem(previewItem) ||
      !previewRuntime.contentUrl
    ) {
      return null
    }

    const blob = await api.getContent(previewRuntime.contentUrl)

    return { runtime: previewRuntime, item: previewItem, blob }
  }

  function applyQueuedScormValues(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    activeRuntime: LearningPathRuntime,
  ): LearningPathRuntime {
    const operation = [...useOfflineSyncStore().operations].reverse().find((candidate) => {
      if (candidate.type !== "http_write") return false
      const payload = candidate.payload as OfflineHttpWritePayload
      const body = payload.request.body as Record<string, unknown> | undefined
      return (
        payload.category === "learning_path_scorm_commit" &&
        Number(body?.itemId) === itemId &&
        payload.request.path.includes(`/learning_paths/${learningPathId}/`) &&
        Number(payload.request.query?.cid) === context.courseId
      )
    })

    if (!operation || operation.type !== "http_write") return activeRuntime
    const payload = operation.payload as OfflineHttpWritePayload
    const clientState = payload.clientState as LearningPathScormCommitPayload | undefined
    if (!clientState) return activeRuntime

    return {
      ...activeRuntime,
      scorm: {
        ...activeRuntime.scorm,
        values: { ...activeRuntime.scorm.values, ...clientState.values },
      },
    }
  }

  async function prepareScormPackage(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    activeRuntime: LearningPathRuntime,
  ): Promise<string> {
    const scorm = activeRuntime.scorm
    await scormPackageHost.assertAvailable()

    if (!scorm.packageEntryPath || !scorm.packageFingerprint) {
      throw new ScormPackageHostError(
        "metadata_missing",
        "The campus did not return the SCORM package entry path and fingerprint.",
      )
    }
    if (scorm.packageSize > MAX_SCORM_PACKAGE_SIZE_BYTES) {
      throw new ScormPackageHostError(
        "too_large",
        "The SCORM package exceeds the mobile runtime size limit.",
      )
    }
    if (activeRuntime.currentItemId !== itemId) {
      throw new LearningPathServiceError("conflict", "The SCORM item is no longer active.")
    }
    if (activeRuntime.items.find(({ id }) => id === itemId)?.itemType === "sco" && !scorm.enabled) {
      throw new ScormPackageHostError(
        "runtime_disabled",
        "The campus did not return an active SCORM attempt for this item.",
      )
    }

    const campus = useCampusStore().selectedCampus
    if (!campus) {
      throw new LearningPathServiceError(
        "session_required",
        "Select a campus before opening SCORM content.",
      )
    }

    const scope = buildScormPackageScope(campus.id, scorm.userId, context, learningPathId)
    const cached = await scormPackageHost.resolve(
      scope,
      scorm.packageFingerprint,
      scorm.packageEntryPath,
    )
    if (cached) {
      return appendScormLaunchParameters(cached, scorm.packageParameters)
    }

    const archive = await api.getScormPackage(context, learningPathId, itemId)

    const installed = await scormPackageHost.install(
      scope,
      scorm.packageFingerprint,
      scorm.packageEntryPath,
      archive,
    )

    return appendScormLaunchParameters(installed, scorm.packageParameters)
  }

  async function openPreparedItem(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<boolean> {
    const prepared = await loadPreparedItem(context, learningPathId, itemId)
    if (!prepared) return false

    const item =
      prepared.runtime.items.find(({ id }) => id === prepared.runtime.currentItemId) ?? null
    if (!item || !isSupportedLearningPathItem(item)) return false

    if (isScormLearningPathItem(item)) {
      const activeRuntime = applyQueuedScormValues(
        context,
        learningPathId,
        itemId,
        structuredClone(prepared.runtime),
      )
      const entryUrl = await prepareScormPackage(
        api,
        context,
        learningPathId,
        itemId,
        activeRuntime,
      )

      runtime.value = activeRuntime
      contentBlob.value = null
      scormEntryUrl.value = entryUrl
      contentStatus.value = "ready"
      contentErrorCode.value = null
      return true
    }

    if (!prepared.contentBlob) return false

    runtime.value = structuredClone(prepared.runtime)
    contentBlob.value = prepared.contentBlob
    scormEntryUrl.value = ""
    contentStatus.value = "ready"
    contentErrorCode.value = null
    return true
  }

  async function openItemWithService(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    syncPrevious: boolean,
  ): Promise<boolean> {
    const currentRuntime = runtime.value

    if (!currentRuntime) {
      actionErrorCode.value = "invalid_response"
      return false
    }

    actionStatus.value = "opening"
    actionErrorCode.value = null
    contentErrorCode.value = null
    contentStatus.value = "loading"

    try {
      if (
        shouldUsePreparedData() &&
        (await openPreparedItem(api, context, learningPathId, itemId))
      ) {
        return true
      }

      const previewRuntime = await api.getRuntime(context, learningPathId, itemId)
      if (
        !useConnectivityStore().campusAvailable &&
        (await openPreparedItem(api, context, learningPathId, itemId))
      ) {
        return true
      }

      const previewItem =
        previewRuntime.items.find(({ id }) => id === previewRuntime.currentItemId) ?? null

      if (!previewItem || !isSupportedLearningPathItem(previewItem)) {
        contentErrorCode.value = "unsupported"
        contentStatus.value = contentBlob.value || scormEntryUrl.value ? "ready" : "error"
        return false
      }

      if (
        syncPrevious &&
        currentRuntime.currentItemId > 0 &&
        currentRuntime.currentItemId !== itemId &&
        !isScormLearningPathItem(
          currentRuntime.items.find(({ id }) => id === currentRuntime.currentItemId),
        )
      ) {
        if (useConnectivityStore().campusAvailable) {
          await api.sync(
            context,
            learningPathId,
            currentRuntime.currentItemId,
            currentRuntime.actionToken,
          )
        } else {
          await queueRegularSync(context, learningPathId, currentRuntime)
        }
      }

      if (
        isQuizLearningPathItem(previewItem) ||
        isSurveyLearningPathItem(previewItem) ||
        isAssignmentLearningPathItem(previewItem) ||
        isForumLearningPathItem(previewItem) ||
        isThreadLearningPathItem(previewItem)
      ) {
        if (!useConnectivityStore().campusAvailable) {
          contentErrorCode.value = "network"
          contentStatus.value = "error"
          return false
        }

        await api.openItem(context, learningPathId, itemId, previewRuntime.actionToken)
        const activeRuntime = await api.getRuntime(context, learningPathId, itemId)
        const activeItem =
          activeRuntime.items.find(({ id }) => id === activeRuntime.currentItemId) ?? null
        const sameInteractiveType =
          (isQuizLearningPathItem(previewItem) && isQuizLearningPathItem(activeItem)) ||
          (isSurveyLearningPathItem(previewItem) && isSurveyLearningPathItem(activeItem)) ||
          (isAssignmentLearningPathItem(previewItem) && isAssignmentLearningPathItem(activeItem)) ||
          (isForumLearningPathItem(previewItem) && isForumLearningPathItem(activeItem)) ||
          (isThreadLearningPathItem(previewItem) && isThreadLearningPathItem(activeItem))

        if (!sameInteractiveType || !activeRuntime.contentUrl) {
          contentErrorCode.value = "unsupported"
          contentStatus.value = "error"
          return false
        }

        runtime.value = activeRuntime
        contentBlob.value = null
        scormEntryUrl.value = ""
        contentErrorCode.value = null
        contentStatus.value = "ready"
        await savePreparedItem(context, learningPathId, itemId, activeRuntime)
        return true
      }

      if (isScormLearningPathItem(previewItem)) {
        let activeRuntime = previewRuntime

        if (useConnectivityStore().campusAvailable) {
          await api.openItem(context, learningPathId, itemId, previewRuntime.actionToken)
          activeRuntime = await api.getRuntime(context, learningPathId, itemId)
        } else {
          activeRuntime = applyQueuedScormValues(context, learningPathId, itemId, activeRuntime)
        }

        const entryUrl = await prepareScormPackage(
          api,
          context,
          learningPathId,
          itemId,
          activeRuntime,
        )

        runtime.value = activeRuntime
        contentBlob.value = null
        scormEntryUrl.value = entryUrl
        contentStatus.value = "ready"
        await savePreparedItem(context, learningPathId, itemId, activeRuntime)
        return true
      }

      const prepared = await prepareRegularItem(api, context, learningPathId, itemId)
      if (!prepared) {
        contentErrorCode.value = "unsupported"
        contentStatus.value = contentBlob.value ? "ready" : "error"
        return false
      }

      if (useConnectivityStore().campusAvailable) {
        await api.openItem(context, learningPathId, itemId, prepared.runtime.actionToken)
        await loadRuntime(api, context, learningPathId, itemId)
      } else {
        runtime.value = prepared.runtime
      }
      scormEntryUrl.value = ""
      contentBlob.value = prepared.blob
      contentStatus.value = "ready"
      await savePreparedItem(
        context,
        learningPathId,
        itemId,
        runtime.value ?? prepared.runtime,
        prepared.blob,
      )

      return true
    } catch (error) {
      try {
        if (await openPreparedItem(api, context, learningPathId, itemId)) {
          actionErrorCode.value = null
          return true
        }
      } catch (preparedError) {
        contentErrorCode.value = mapError(preparedError)
      }

      contentErrorCode.value = contentErrorCode.value ?? mapError(error)
      actionErrorCode.value = error instanceof LearningPathServiceError ? mapError(error) : null
      contentStatus.value = contentBlob.value || scormEntryUrl.value ? "ready" : "error"
      return false
    } finally {
      actionStatus.value = "idle"
    }
  }

  async function start(context: CourseNavigationContext, learningPathId: number): Promise<boolean> {
    const api = service()

    if (!api) {
      errorCode.value = "campus_required"
      status.value = "error"
      return false
    }

    status.value = "loading"
    errorCode.value = null
    actionErrorCode.value = null
    clearContent()

    try {
      if (shouldUsePreparedData() && (await restorePreparedStart(api, context, learningPathId))) {
        return true
      }

      const initialRuntime = await loadRuntime(api, context, learningPathId)
      if (
        !useConnectivityStore().campusAvailable &&
        (await restorePreparedStart(api, context, learningPathId))
      ) {
        return true
      }

      await savePreparedItem(context, learningPathId, 0, initialRuntime)
      status.value = "ready"
      const item =
        initialRuntime.items.find(({ id }) => id === initialRuntime.currentItemId) ?? null

      if (isSupportedLearningPathItem(item)) {
        await openItemWithService(api, context, learningPathId, initialRuntime.currentItemId, false)
      }

      return true
    } catch (error) {
      if (await restorePreparedStart(api, context, learningPathId)) return true

      errorCode.value = mapError(error)
      status.value = "error"
      return false
    }
  }

  async function activateItem(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      actionErrorCode.value = "campus_required"
      return false
    }

    return openItemWithService(api, context, learningPathId, itemId, true)
  }

  async function queueRegularSync(
    context: CourseNavigationContext,
    learningPathId: number,
    activeRuntime: LearningPathRuntime,
    uncertainDelivery = false,
  ): Promise<boolean> {
    const queued = await useOfflineSyncStore().enqueueLearningPathSync({
      context,
      learningPathId,
      itemId: activeRuntime.currentItemId,
      actionToken: activeRuntime.actionToken,
      uncertainDelivery,
    })

    offlineQueued.value = queued
    return queued
  }

  async function performSync(
    context: CourseNavigationContext,
    learningPathId: number,
    refreshRuntime: boolean,
  ): Promise<boolean> {
    const api = service()
    const currentRuntime = runtime.value

    if (
      !api ||
      !currentRuntime ||
      currentRuntime.currentItemId <= 0 ||
      contentStatus.value !== "ready"
    ) {
      return false
    }

    actionStatus.value = "syncing"
    actionErrorCode.value = null

    try {
      if (!currentItemIsScorm.value) {
        if (!useConnectivityStore().campusAvailable) {
          return queueRegularSync(context, learningPathId, currentRuntime)
        }

        try {
          await api.sync(
            context,
            learningPathId,
            currentRuntime.currentItemId,
            currentRuntime.actionToken,
          )
          offlineQueued.value = false
        } catch (error) {
          const mappedError = mapError(error)

          if (mappedError === "network" || mappedError === "timeout") {
            return queueRegularSync(context, learningPathId, currentRuntime, true)
          }

          throw error
        }
      }

      if (refreshRuntime) {
        await loadRuntime(api, context, learningPathId, currentRuntime.currentItemId)
      }

      return true
    } catch (error) {
      actionErrorCode.value = mapError(error)
      return false
    } finally {
      actionStatus.value = "idle"
    }
  }

  function sync(
    context: CourseNavigationContext,
    learningPathId: number,
    refreshRuntime = true,
  ): Promise<boolean> {
    if (pendingSync) return pendingSync

    pendingSync = performSync(context, learningPathId, refreshRuntime).finally(() => {
      pendingSync = null
    })

    return pendingSync
  }

  async function commitScorm(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    scorm: LearningPathScormRuntime,
    actionToken: string,
    payload: LearningPathScormCommitPayload,
  ): Promise<void> {
    const api = service()
    if (!api) {
      throw new LearningPathServiceError("session_required", "A campus session is required.")
    }

    scormSaving.value = true
    actionErrorCode.value = null

    const queueCommit = async (uncertainDelivery = false): Promise<boolean> => {
      const request = buildLearningPathScormCommitRequest(context, learningPathId)
      return useOfflineSyncStore().enqueueHttpWrite({
        category: "learning_path_scorm_commit",
        description: `SCORM progress for learning path ${learningPathId}`,
        dedupeKey: `lp:${learningPathId}:item:${itemId}:scorm`,
        uncertainDelivery,
        clientState: structuredClone(payload),
        request: {
          method: "POST",
          path: request.path,
          query: request.query,
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/json",
          },
          body: {
            itemId,
            itemViewId: scorm.itemViewId,
            version: scorm.version,
            values: payload.values,
            changedKeys: payload.changedKeys,
            terminated: payload.terminated,
            reason: payload.reason,
            csrfToken: actionToken,
          },
        },
      })
    }

    try {
      if (!useConnectivityStore().campusAvailable) {
        const queued = await queueCommit()
        if (!queued) {
          throw new LearningPathServiceError("server", "SCORM progress could not be queued.")
        }
        offlineQueued.value = true
        return
      }

      await api.commitScorm(context, learningPathId, itemId, scorm, actionToken, payload)
      offlineQueued.value = false
    } catch (error) {
      const mappedError = mapError(error)
      if (mappedError === "network" || mappedError === "timeout") {
        await queueCommit(true)
      }
      actionErrorCode.value = mappedError
      throw error
    } finally {
      scormSaving.value = false
    }
  }

  async function restart(
    context: CourseNavigationContext,
    learningPathId: number,
  ): Promise<boolean> {
    const api = service()
    const currentRuntime = runtime.value

    if (!api || !currentRuntime?.canRestart) return false

    actionStatus.value = "restarting"
    actionErrorCode.value = null
    clearContent()

    try {
      await api.restart(context, learningPathId, currentRuntime.actionToken)
      const nextRuntime = await loadRuntime(api, context, learningPathId)
      const item = nextRuntime.items.find(({ id }) => id === nextRuntime.currentItemId) ?? null

      if (isSupportedLearningPathItem(item)) {
        await openItemWithService(api, context, learningPathId, nextRuntime.currentItemId, false)
      }

      return true
    } catch (error) {
      actionErrorCode.value = mapError(error)
      return false
    } finally {
      actionStatus.value = "idle"
    }
  }

  async function openCurrentContent(): Promise<boolean> {
    const blob = contentBlob.value
    const item = currentItem.value

    if (!blob || !item) {
      contentErrorCode.value = "unsupported"
      contentStatus.value = "error"
      return false
    }

    try {
      await createDocumentBlobPresenter().open(blob, item.title || "lesson")
      return true
    } catch (error) {
      contentErrorCode.value = mapError(error)
      contentStatus.value = "error"
      return false
    }
  }

  async function downloadCurrentContent(): Promise<boolean> {
    const blob = contentBlob.value
    const item = currentItem.value

    if (!blob || !item) {
      contentErrorCode.value = "unsupported"
      contentStatus.value = "error"
      return false
    }

    try {
      await createDocumentBlobPresenter().download(blob, item.title || "lesson")
      return true
    } catch (error) {
      contentErrorCode.value = mapError(error)
      contentStatus.value = "error"
      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    actionStatus.value = "idle"
    contentStatus.value = "idle"
    runtime.value = null
    contentBlob.value = null
    scormEntryUrl.value = ""
    scormSaving.value = false
    offlineQueued.value = false
    errorCode.value = null
    actionErrorCode.value = null
    contentErrorCode.value = null
    pendingSync = null
  }

  return {
    status,
    actionStatus,
    contentStatus,
    runtime,
    contentBlob,
    scormEntryUrl,
    scormSaving,
    offlineQueued,
    errorCode,
    actionErrorCode,
    contentErrorCode,
    currentItem,
    currentItemIsScorm,
    isBusy,
    start,
    activateItem,
    sync,
    commitScorm,
    restart,
    openCurrentContent,
    downloadCurrentContent,
    reset,
  }
})
