import { computed, ref, shallowRef } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { isSupportedLearningPathItem } from "@/domain/learningPaths/contracts"
import type { LearningPathRuntime, LearningPathRuntimeItem } from "@/domain/learningPaths/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import {
  LearningPathApiService,
  LearningPathServiceError,
  type LearningPathErrorCode,
} from "@/services/learningPaths/LearningPathApiService"
import { useCampusStore } from "@/stores/campus"

export type LearningPathStatus = "idle" | "loading" | "ready" | "error"
export type LearningPathActionStatus = "idle" | "opening" | "syncing" | "restarting"
export type LearningPathContentStatus = "idle" | "loading" | "ready" | "error"
export type LearningPathStoreErrorCode = LearningPathErrorCode | "campus_required"

interface PreparedLearningPathItem {
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
  const errorCode = ref<LearningPathStoreErrorCode | null>(null)
  const actionErrorCode = ref<LearningPathStoreErrorCode | null>(null)
  const contentErrorCode = ref<LearningPathStoreErrorCode | null>(null)

  let pendingSync: Promise<boolean> | null = null

  const currentItem = computed(
    () => runtime.value?.items.find(({ id }) => id === runtime.value?.currentItemId) ?? null,
  )
  const isBusy = computed(() => actionStatus.value !== "idle" || contentStatus.value === "loading")

  function service(): LearningPathApiService | null {
    const campus = useCampusStore().selectedCampus

    return campus ? new LearningPathApiService(createAuthenticatedHttpClient(campus)) : null
  }

  function mapError(error: unknown): LearningPathStoreErrorCode {
    return error instanceof LearningPathServiceError ? error.code : "server"
  }

  function clearContent(): void {
    contentBlob.value = null
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

  async function prepareItem(
    api: LearningPathApiService,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<PreparedLearningPathItem | null> {
    contentErrorCode.value = null
    contentStatus.value = "loading"

    try {
      const previewRuntime = await api.getRuntime(context, learningPathId, itemId)
      const previewItem =
        previewRuntime.items.find(({ id }) => id === previewRuntime.currentItemId) ?? null

      if (!previewItem || !isSupportedLearningPathItem(previewItem) || !previewRuntime.contentUrl) {
        contentErrorCode.value = "unsupported"
        contentStatus.value = contentBlob.value ? "ready" : "error"
        return null
      }

      const blob = await api.getContent(previewRuntime.contentUrl)

      return {
        runtime: previewRuntime,
        item: previewItem,
        blob,
      }
    } catch (error) {
      contentErrorCode.value = mapError(error)
      contentStatus.value = contentBlob.value ? "ready" : "error"
      return null
    }
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

    try {
      // Resolve and fetch the content first. A broken or missing resource must not
      // be submitted to runtime/item because simple items are completed on open.
      const prepared = await prepareItem(api, context, learningPathId, itemId)

      if (!prepared) {
        return false
      }

      if (
        syncPrevious &&
        currentRuntime.currentItemId > 0 &&
        currentRuntime.currentItemId !== itemId &&
        contentStatus.value === "loading"
      ) {
        await api.sync(
          context,
          learningPathId,
          currentRuntime.currentItemId,
          currentRuntime.actionToken,
        )
      }

      await api.openItem(context, learningPathId, itemId, prepared.runtime.actionToken)

      await loadRuntime(api, context, learningPathId, itemId)
      contentBlob.value = prepared.blob
      contentStatus.value = "ready"
      contentErrorCode.value = null

      return true
    } catch (error) {
      actionErrorCode.value = mapError(error)
      contentStatus.value = contentBlob.value ? "ready" : "error"
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
      const initialRuntime = await loadRuntime(api, context, learningPathId)
      status.value = "ready"

      const item =
        initialRuntime.items.find(({ id }) => id === initialRuntime.currentItemId) ?? null

      if (isSupportedLearningPathItem(item)) {
        await openItemWithService(api, context, learningPathId, initialRuntime.currentItemId, false)
      }

      return true
    } catch (error) {
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
      await api.sync(
        context,
        learningPathId,
        currentRuntime.currentItemId,
        currentRuntime.actionToken,
      )

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
    if (pendingSync) {
      return pendingSync
    }

    pendingSync = performSync(context, learningPathId, refreshRuntime).finally(() => {
      pendingSync = null
    })

    return pendingSync
  }

  async function restart(
    context: CourseNavigationContext,
    learningPathId: number,
  ): Promise<boolean> {
    const api = service()
    const currentRuntime = runtime.value

    if (!api || !currentRuntime?.canRestart) {
      return false
    }

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
    errorCode,
    actionErrorCode,
    contentErrorCode,
    currentItem,
    isBusy,
    start,
    activateItem,
    sync,
    restart,
    openCurrentContent,
    downloadCurrentContent,
    reset,
  }
})
