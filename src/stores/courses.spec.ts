import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CoursesOverview } from "@/domain/courses/types"
import type { CacheRecord, CampusCacheRepository } from "@/services/cache/CampusCacheRepository"
import { CoursesServiceError } from "@/services/courses/CoursesApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import {
  resetCoursesDependencies,
  setCoursesDependenciesForTests,
  useCoursesStore,
} from "@/stores/courses"

const campus: CampusProfile = {
  id: "campus-a",
  displayName: "Campus A",
  baseUrl: "https://campus.example.org",
  allowInsecureHttp: false,
  compatibilityStatus: "unknown",
  compatibilityCheckedAt: null,
  createdAt: "2026-07-17T00:00:00.000Z",
  updatedAt: "2026-07-17T00:00:00.000Z",
  lastUsedAt: "2026-07-17T00:00:00.000Z",
}

const overview: CoursesOverview = {
  directCourses: [],
  currentSessions: [],
  upcomingSessions: [],
  pastSessions: [],
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

class MemoryCacheRepository implements CampusCacheRepository {
  record: CacheRecord<CoursesOverview> | null = null
  lastCampusId: string | null = null
  lastUserId: number | null = null

  loadCourses(campusId: string, userId: number): CacheRecord<CoursesOverview> | null {
    this.lastCampusId = campusId
    this.lastUserId = userId

    return this.record ? structuredClone(this.record) : null
  }

  saveCourses(campusId: string, userId: number, data: CoursesOverview): void {
    this.lastCampusId = campusId
    this.lastUserId = userId
    this.record = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: structuredClone(data),
    }
  }

  clearCampus(): void {
    this.record = null
  }
}

function prepareAuthenticatedStores() {
  const campusStore = useCampusStore()
  campusStore.profiles = [campus]
  campusStore.selectedCampusId = campus.id
  campusStore.initialized = true

  const authStore = useAuthStore()
  authStore.profile = {
    id: 7,
    username: "student",
    firstname: "Mobile",
    lastname: "Student",
    fullName: "Mobile Student",
    email: "student@example.org",
    locale: "en",
    timezone: "UTC",
    roles: ["ROLE_USER"],
  }
  authStore.currentCampusId = campus.id
  authStore.status = "authenticated"
}

describe("courses store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetCoursesDependencies()
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true })
  })

  it("loads fresh data and saves a campus cache", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryCacheRepository()
    const getOverview = vi.fn().mockResolvedValue(overview)
    setCoursesDependenciesForTests(cache, () => ({ getOverview }))
    const store = useCoursesStore()

    await expect(store.loadOverview()).resolves.toBe(true)

    expect(getOverview).toHaveBeenCalledWith(7)
    expect(store.status).toBe("ready")
    expect(store.isStale).toBe(false)
    expect(cache.record?.data).toEqual(overview)
    expect(cache.lastCampusId).toBe("campus-a")
    expect(cache.lastUserId).toBe(7)
  })

  it("uses cached data while offline", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryCacheRepository()
    cache.record = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: overview,
    }
    const getOverview = vi.fn()
    setCoursesDependenciesForTests(cache, () => ({ getOverview }))
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false })
    const store = useCoursesStore()

    await expect(store.loadOverview()).resolves.toBe(true)

    expect(getOverview).not.toHaveBeenCalled()
    expect(store.status).toBe("ready")
    expect(store.isStale).toBe(true)
    expect(store.errorCode).toBe("offline")
  })

  it("keeps cached data when the network request fails", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryCacheRepository()
    cache.record = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: overview,
    }
    setCoursesDependenciesForTests(cache, () => ({
      getOverview: vi.fn().mockRejectedValue(new CoursesServiceError("network", "Offline")),
    }))
    const store = useCoursesStore()

    await expect(store.loadOverview(true)).resolves.toBe(true)

    expect(store.status).toBe("ready")
    expect(store.isStale).toBe(true)
    expect(store.errorCode).toBe("network")
  })

  it("shows an error when no cache is available", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryCacheRepository()
    setCoursesDependenciesForTests(cache, () => ({
      getOverview: vi.fn().mockRejectedValue(new CoursesServiceError("timeout", "Timeout")),
    }))
    const store = useCoursesStore()

    await expect(store.loadOverview()).resolves.toBe(false)

    expect(store.status).toBe("error")
    expect(store.errorCode).toBe("timeout")
  })
})
