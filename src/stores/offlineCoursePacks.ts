import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CourseHomeEntry, CourseToolKey } from "@/domain/courseHome/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildOfflineCoursePackKey,
  OFFLINE_COURSE_PACK_TOOL_OPTIONS,
  type OfflineAccountDataSnapshot,
  type OfflineCoursePackManifest,
  type OfflineCoursePackProgress,
  type OfflineCoursePackToolKey,
  type OfflineStorageEstimate,
} from "@/domain/offline/coursePackTypes"
import { offlineAccountDataManager } from "@/services/offline/OfflineAccountDataManager"
import {
  OfflineCoursePackManager,
  type PrepareOfflineCoursePackInput,
} from "@/services/offline/OfflineCoursePackManager"
import { offlineCoursePackRepository } from "@/services/offline/OfflineCoursePackRepository"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

export type OfflineCoursePacksErrorCode =
  | "campus_required"
  | "session_required"
  | "offline"
  | "storage_failed"
  | "prepare_failed"
  | "remove_failed"

const idleProgress = (): OfflineCoursePackProgress => ({
  status: "idle",
  currentTool: null,
  currentResource: "",
  completedTools: 0,
  totalTools: 0,
  completedResources: 0,
  downloadedBytes: 0,
  cancelRequested: false,
})

export const useOfflineCoursePacksStore = defineStore("offlineCoursePacks", () => {
  const manifests = ref<OfflineCoursePackManifest[]>([])
  const progress = ref<OfflineCoursePackProgress>(idleProgress())
  const storage = ref<OfflineStorageEstimate>({ usage: null, quota: null })
  const accountData = ref<OfflineAccountDataSnapshot | null>(null)
  const isLoading = ref(false)
  const isPreparingAccountData = ref(false)
  const errorCode = ref<OfflineCoursePacksErrorCode | null>(null)
  let manager: OfflineCoursePackManager | null = null

  const isBusy = computed(
    () =>
      progress.value.status === "preparing" ||
      progress.value.status === "removing" ||
      isPreparingAccountData.value,
  )

  const readyCount = computed(
    () => manifests.value.filter(({ status }) => status === "ready").length,
  )

  function session() {
    const campus = useCampusStore().selectedCampus
    const profile = useAuthStore().profile

    if (!campus) {
      errorCode.value = "campus_required"
      return null
    }

    if (!profile) {
      errorCode.value = "session_required"
      return null
    }

    return { campus, profile }
  }

  async function refresh(): Promise<boolean> {
    const active = session()
    if (!active) return false

    isLoading.value = true
    errorCode.value = null

    try {
      const [nextManifests, nextStorage, nextAccountData] = await Promise.all([
        offlineCoursePackRepository.list(active.campus.id, active.profile.id),
        offlineCoursePackRepository.storageEstimate(),
        offlineAccountDataManager.load(active.campus.id, active.profile.id),
      ])

      manifests.value = nextManifests
      storage.value = nextStorage
      accountData.value = nextAccountData
      return true
    } catch {
      errorCode.value = "storage_failed"
      return false
    } finally {
      isLoading.value = false
    }
  }

  function manifestForContext(context: CourseNavigationContext): OfflineCoursePackManifest | null {
    const key = buildOfflineCoursePackKey(context)

    return manifests.value.find(({ courseKey }) => courseKey === key) ?? null
  }

  function manifestFor(entry: CourseHomeEntry): OfflineCoursePackManifest | null {
    return manifestForContext(entry.context)
  }

  function selectableTools(availableTools: readonly CourseToolKey[]): OfflineCoursePackToolKey[] {
    const availableSet = new Set<CourseToolKey>(availableTools)

    return OFFLINE_COURSE_PACK_TOOL_OPTIONS.filter(
      ({ key }) => key === "course-home" || availableSet.has(key),
    ).map(({ key }) => key)
  }

  async function prepareCourse(
    entry: CourseHomeEntry,
    availableTools: readonly CourseToolKey[],
    selectedTools: OfflineCoursePackToolKey[],
    prepareExerciseAttempts = false,
  ): Promise<boolean> {
    const active = session()
    if (!active) return false

    if (!useConnectivityStore().deviceOnline) {
      errorCode.value = "offline"
      return false
    }

    const allowed = new Set(selectableTools(availableTools))
    const normalized = [...new Set(selectedTools)].filter((tool) => allowed.has(tool))

    if (normalized.length === 0) {
      errorCode.value = "prepare_failed"
      return false
    }

    errorCode.value = null
    manager = new OfflineCoursePackManager()
    progress.value = idleProgress()

    const input: PrepareOfflineCoursePackInput = {
      campus: active.campus,
      profile: active.profile,
      entry,
      selectedTools: normalized,
      prepareExerciseAttempts,
    }

    try {
      const manifest = await manager.prepare(input, (nextProgress) => {
        progress.value = nextProgress
      })
      const index = manifests.value.findIndex(({ courseKey }) => courseKey === manifest.courseKey)

      if (index >= 0) manifests.value[index] = manifest
      else manifests.value.unshift(manifest)

      storage.value = await offlineCoursePackRepository.storageEstimate()
      return manifest.status !== "error"
    } catch {
      errorCode.value = "prepare_failed"
      progress.value = { ...progress.value, status: "error" }
      return false
    } finally {
      manager = null
    }
  }

  function cancelPreparation(): void {
    manager?.cancel()
    progress.value = { ...progress.value, cancelRequested: true }
  }

  async function removeCourse(manifest: OfflineCoursePackManifest): Promise<boolean> {
    errorCode.value = null
    progress.value = { ...idleProgress(), status: "removing" }

    try {
      await offlineCoursePackRepository.remove(manifest)
      manifests.value = manifests.value.filter(({ courseKey }) => courseKey !== manifest.courseKey)
      storage.value = await offlineCoursePackRepository.storageEstimate()
      progress.value = idleProgress()
      return true
    } catch {
      errorCode.value = "remove_failed"
      progress.value = { ...progress.value, status: "error" }
      return false
    }
  }

  async function prepareAccountData(): Promise<boolean> {
    const active = session()
    if (!active) return false

    if (!useConnectivityStore().deviceOnline) {
      errorCode.value = "offline"
      return false
    }

    isPreparingAccountData.value = true
    errorCode.value = null

    try {
      accountData.value = await offlineAccountDataManager.prepare(active.campus, active.profile.id)
      storage.value = await offlineCoursePackRepository.storageEstimate()
      return true
    } catch {
      errorCode.value = "prepare_failed"
      return false
    } finally {
      isPreparingAccountData.value = false
    }
  }

  return {
    manifests,
    progress,
    storage,
    accountData,
    isLoading,
    isPreparingAccountData,
    errorCode,
    isBusy,
    readyCount,
    refresh,
    manifestFor,
    manifestForContext,
    selectableTools,
    prepareCourse,
    cancelPreparation,
    removeCourse,
    prepareAccountData,
  }
})
