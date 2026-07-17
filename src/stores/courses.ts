import { computed, onScopeDispose, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CoursesOverview } from "@/domain/courses/types"
import { registerCampusSessionDataCleaner } from "@/services/auth/CampusSessionDataCleaner"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { browserCampusCacheRepository } from "@/services/cache/BrowserCampusCacheRepository"
import {
  CampusCacheError,
  type CampusCacheRepository,
} from "@/services/cache/CampusCacheRepository"
import {
  CoursesApiService,
  CoursesServiceError,
  type CoursesErrorCode,
} from "@/services/courses/CoursesApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

export type CoursesStatus = "idle" | "loading" | "ready" | "error"
export type CoursesStoreErrorCode =
  | CoursesErrorCode
  | "campus_required"
  | "offline"
  | "cache_failed"

export type CoursesApi = Pick<CoursesApiService, "getOverview">
export type CoursesApiFactory = (campus: CampusProfile) => CoursesApi

let cacheRepository: CampusCacheRepository = browserCampusCacheRepository
let coursesApiFactory: CoursesApiFactory = (campus) =>
  new CoursesApiService(createAuthenticatedHttpClient(campus))

export function setCoursesDependenciesForTests(
  testCacheRepository: CampusCacheRepository,
  testCoursesApiFactory: CoursesApiFactory,
): void {
  cacheRepository = testCacheRepository
  coursesApiFactory = testCoursesApiFactory
}

export function resetCoursesDependencies(): void {
  cacheRepository = browserCampusCacheRepository
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
  if (error instanceof CoursesServiceError) {
    return error.code
  }

  if (error instanceof CampusCacheError) {
    return "cache_failed"
  }

  return "server"
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

    let hasCachedOverview = false

    try {
      const cached = cacheRepository.loadCourses(campus.id, profile.id)

      if (cached) {
        overview.value = cached.data
        cacheSavedAt.value = cached.savedAt
        status.value = "ready"
        isStale.value = true
        hasCachedOverview = true
      }
    } catch (error) {
      errorCode.value = mapCoursesError(error)
    }

    if (globalThis.navigator?.onLine === false) {
      errorCode.value = "offline"
      status.value = hasCachedOverview ? "ready" : "error"
      isStale.value = hasCachedOverview

      return hasCachedOverview
    }

    if (hasCachedOverview) {
      isRefreshing.value = true
    } else {
      status.value = "loading"
    }

    errorCode.value = null

    try {
      const freshOverview = await coursesApiFactory(campus).getOverview(profile.id)

      overview.value = freshOverview
      cacheSavedAt.value = new Date().toISOString()
      status.value = "ready"
      isStale.value = false

      try {
        cacheRepository.saveCourses(campus.id, profile.id, freshOverview)
      } catch {
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

  function clearCampusCache(campusId: string): boolean {
    try {
      cacheRepository.clearCampus(campusId)

      if (currentCampusId.value === campusId) {
        resetState()
      }

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
    if (currentCampusId.value === campusId) {
      resetState()
    }
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
