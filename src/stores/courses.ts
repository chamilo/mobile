import { computed, onScopeDispose, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CoursesOverview } from "@/domain/courses/types"
import { registerCampusSessionDataCleaner } from "@/services/auth/CampusSessionDataCleaner"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { browserCampusCacheRepository } from "@/services/cache/BrowserCampusCacheRepository"
import {
  CampusCacheError,
  type CacheRecord,
  type CampusCacheRepository,
} from "@/services/cache/CampusCacheRepository"
import {
  CoursesApiService,
  CoursesServiceError,
  type CoursesErrorCode,
} from "@/services/courses/CoursesApiService"
import {
  offlineSnapshotRepository,
  type OfflineSnapshotRepository,
} from "@/services/offline/OfflineSnapshotRepository"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

const COURSES_SNAPSHOT_KEY = "courses-overview-v1"

export type CoursesStatus = "idle" | "loading" | "ready" | "error"
export type CoursesStoreErrorCode =
  | CoursesErrorCode
  | "campus_required"
  | "offline"
  | "cache_failed"

export type CoursesApi = Pick<CoursesApiService, "getOverview">
export type CoursesApiFactory = (campus: CampusProfile) => CoursesApi

let cacheRepository: CampusCacheRepository = browserCampusCacheRepository
let durableCacheRepository: OfflineSnapshotRepository = offlineSnapshotRepository
let coursesApiFactory: CoursesApiFactory = (campus) =>
  new CoursesApiService(createAuthenticatedHttpClient(campus))

export function setCoursesDependenciesForTests(
  testCacheRepository: CampusCacheRepository,
  testCoursesApiFactory: CoursesApiFactory,
  testDurableCacheRepository: OfflineSnapshotRepository = offlineSnapshotRepository,
): void {
  cacheRepository = testCacheRepository
  coursesApiFactory = testCoursesApiFactory
  durableCacheRepository = testDurableCacheRepository
}

export function resetCoursesDependencies(): void {
  cacheRepository = browserCampusCacheRepository
  durableCacheRepository = offlineSnapshotRepository
  coursesApiFactory = (campus) => new CoursesApiService(createAuthenticatedHttpClient(campus))
}

function emptyOverview(): CoursesOverview {
  return {
    directCourses: [],
    currentSessions: [],
    upcomingSessions: [],
    pastSessions: [],
    fetchedAt: "",
  }
}

function mapCoursesError(error: unknown): CoursesStoreErrorCode {
  if (error instanceof CoursesServiceError) return error.code
  if (error instanceof CampusCacheError) return "cache_failed"

  return "server"
}

function latestCache(records: CacheRecord<CoursesOverview>[]): CacheRecord<CoursesOverview> | null {
  return records.sort((left, right) => right.savedAt.localeCompare(left.savedAt))[0] ?? null
}

export const useCoursesStore = defineStore("courses", () => {
  const status = ref<CoursesStatus>("idle")
  const currentCampusId = ref<string | null>(null)
  const currentUserId = ref<number | null>(null)
  const overview = ref<CoursesOverview>(emptyOverview())
  const errorCode = ref<CoursesStoreErrorCode | null>(null)
  const isStale = ref(false)
  const isRefreshing = ref(false)
  const cacheSavedAt = ref<string | null>(null)

  const hasContent = computed(
    () =>
      overview.value.directCourses.length > 0 ||
      overview.value.currentSessions.some((session) => session.courses.length > 0) ||
      overview.value.upcomingSessions.some((session) => session.courses.length > 0) ||
      overview.value.pastSessions.some((session) => session.courses.length > 0),
  )

  function resetState(): void {
    status.value = "idle"
    currentCampusId.value = null
    currentUserId.value = null
    overview.value = emptyOverview()
    errorCode.value = null
    isStale.value = false
    isRefreshing.value = false
    cacheSavedAt.value = null
  }

  async function loadCachedOverview(
    campusId: string,
    userId: number,
  ): Promise<CacheRecord<CoursesOverview> | null> {
    const records: CacheRecord<CoursesOverview>[] = []
    let browserRecord: CacheRecord<CoursesOverview> | null = null

    try {
      browserRecord = cacheRepository.loadCourses(campusId, userId)
      if (browserRecord) records.push(browserRecord)
    } catch (error) {
      errorCode.value = mapCoursesError(error)
    }

    try {
      const durableRecord = await durableCacheRepository.load<CoursesOverview>(
        campusId,
        userId,
        COURSES_SNAPSHOT_KEY,
      )
      if (durableRecord) {
        records.push({ version: 1, savedAt: durableRecord.savedAt, data: durableRecord.data })
      } else if (browserRecord) {
        await durableCacheRepository.save(
          campusId,
          userId,
          COURSES_SNAPSHOT_KEY,
          browserRecord.data,
        )
      }
    } catch {
      if (!browserRecord) errorCode.value = "cache_failed"
    }

    return latestCache(records)
  }

  async function saveCachedOverview(
    campusId: string,
    userId: number,
    data: CoursesOverview,
  ): Promise<boolean> {
    let browserSaved = false
    let durableSaved = false

    try {
      cacheRepository.saveCourses(campusId, userId, data)
      browserSaved = true
    } catch {
      // The durable cache may still succeed.
    }

    try {
      await durableCacheRepository.save(campusId, userId, COURSES_SNAPSHOT_KEY, data)
      durableSaved = true
    } catch {
      // The browser cache may still keep a last-read fallback.
    }

    return browserSaved || durableSaved
  }

  async function loadOverview(force = false): Promise<boolean> {
    const campus = useCampusStore().selectedCampus
    const profile = useAuthStore().profile

    if (!campus) {
      resetState()
      status.value = "error"
      errorCode.value = "campus_required"
      return false
    }

    if (!profile) {
      resetState()
      currentCampusId.value = campus.id
      status.value = "error"
      errorCode.value = "session_required"
      return false
    }

    if (
      !force &&
      currentCampusId.value === campus.id &&
      currentUserId.value === profile.id &&
      status.value === "ready" &&
      !isStale.value
    ) {
      return true
    }

    if (currentCampusId.value !== campus.id || currentUserId.value !== profile.id) {
      resetState()
      currentCampusId.value = campus.id
      currentUserId.value = profile.id
    }

    const cached = await loadCachedOverview(campus.id, profile.id)
    const hasCachedOverview = Boolean(cached)

    if (cached) {
      overview.value = cached.data
      cacheSavedAt.value = cached.savedAt
      status.value = "ready"
      isStale.value = true
    }

    if (!useConnectivityStore().deviceOnline) {
      errorCode.value = "offline"
      status.value = hasCachedOverview ? "ready" : "error"
      isStale.value = hasCachedOverview
      return hasCachedOverview
    }

    if (hasCachedOverview) isRefreshing.value = true
    else status.value = "loading"

    errorCode.value = null

    try {
      const freshOverview = await coursesApiFactory(campus).getOverview(profile.id)

      overview.value = freshOverview
      cacheSavedAt.value = new Date().toISOString()
      status.value = "ready"
      isStale.value = false

      if (!(await saveCachedOverview(campus.id, profile.id, freshOverview))) {
        errorCode.value = "cache_failed"
      }

      return true
    } catch (error) {
      errorCode.value = mapCoursesError(error)
      status.value = hasCachedOverview ? "ready" : "error"
      isStale.value = hasCachedOverview
      return hasCachedOverview
    } finally {
      isRefreshing.value = false
    }
  }

  function clearActiveOverview(): void {
    resetState()
  }

  async function clearCampusCache(campusId: string): Promise<boolean> {
    try {
      cacheRepository.clearCampus(campusId)
      await durableCacheRepository.clearCampus(campusId)

      if (currentCampusId.value === campusId) resetState()
      return true
    } catch {
      errorCode.value = "cache_failed"
      return false
    }
  }

  function clearError(): void {
    errorCode.value = null
  }

  const unregisterSessionCleaner = registerCampusSessionDataCleaner((campusId) => {
    if (currentCampusId.value === campusId) resetState()
  })
  onScopeDispose(unregisterSessionCleaner)

  return {
    status,
    currentCampusId,
    currentUserId,
    overview,
    errorCode,
    isStale,
    isRefreshing,
    cacheSavedAt,
    hasContent,
    loadOverview,
    clearActiveOverview,
    clearCampusCache,
    clearError,
  }
})
