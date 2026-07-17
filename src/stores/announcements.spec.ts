import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import type {
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
} from "@/domain/announcements/types"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { AnnouncementsServiceError } from "@/services/announcements/AnnouncementsApiService"
import type { AnnouncementsCacheRepository } from "@/services/cache/AnnouncementsCacheRepository"
import type { CacheRecord } from "@/services/cache/CampusCacheRepository"
import {
  resetAnnouncementsDependencies,
  setAnnouncementsDependenciesForTests,
  useAnnouncementsStore,
} from "@/stores/announcements"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

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

const context: CourseNavigationContext = {
  courseId: 12,
  sessionId: null,
  membershipId: 33,
  sessionCourseId: null,
  source: "direct",
}

const listSnapshot: AnnouncementListSnapshot = {
  context,
  items: [],
  totalItems: 0,
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

const detailSnapshot: AnnouncementDetailSnapshot = {
  context,
  item: {
    id: 5,
    title: "Welcome",
    author: null,
    createdAt: null,
    updatedAt: null,
    emailSent: false,
    hasAttachments: false,
    attachmentCount: 0,
    displayOrder: 1,
    contentHtml: "<p>Hello</p>",
    language: "en",
    attachments: [],
  },
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

class MemoryAnnouncementsCache implements AnnouncementsCacheRepository {
  list: CacheRecord<AnnouncementListSnapshot> | null = null
  detail: CacheRecord<AnnouncementDetailSnapshot> | null = null

  loadList(): CacheRecord<AnnouncementListSnapshot> | null {
    return this.list ? structuredClone(this.list) : null
  }

  saveList(
    _campusId: string,
    _userId: number,
    _context: CourseNavigationContext,
    snapshot: AnnouncementListSnapshot,
  ): void {
    this.list = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: structuredClone(snapshot),
    }
  }

  loadDetail(): CacheRecord<AnnouncementDetailSnapshot> | null {
    return this.detail ? structuredClone(this.detail) : null
  }

  saveDetail(
    _campusId: string,
    _userId: number,
    _context: CourseNavigationContext,
    snapshot: AnnouncementDetailSnapshot,
  ): void {
    this.detail = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: structuredClone(snapshot),
    }
  }
}

function prepareAuthenticatedStores(): void {
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

describe("announcements store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetAnnouncementsDependencies()
    window.localStorage.clear()
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true })
  })

  it("loads and caches the list", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryAnnouncementsCache()
    const getList = vi.fn().mockResolvedValue(listSnapshot)
    setAnnouncementsDependenciesForTests(cache, () => ({
      getList,
      getDetail: vi.fn(),
    }))
    const store = useAnnouncementsStore()

    await expect(store.loadList(context)).resolves.toBe(true)

    expect(store.listStatus).toBe("ready")
    expect(store.isListStale).toBe(false)
    expect(cache.list?.data).toEqual(listSnapshot)
  })

  it("uses cached list data while offline", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryAnnouncementsCache()
    cache.list = {
      version: 1,
      savedAt: "2026-07-17T00:01:00.000Z",
      data: listSnapshot,
    }
    const getList = vi.fn()
    setAnnouncementsDependenciesForTests(cache, () => ({
      getList,
      getDetail: vi.fn(),
    }))
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false })
    const store = useAnnouncementsStore()

    await expect(store.loadList(context)).resolves.toBe(true)

    expect(getList).not.toHaveBeenCalled()
    expect(store.isListStale).toBe(true)
    expect(store.listErrorCode).toBe("offline")
  })

  it("loads and caches a detail", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryAnnouncementsCache()
    const getDetail = vi.fn().mockResolvedValue(detailSnapshot)
    setAnnouncementsDependenciesForTests(cache, () => ({
      getList: vi.fn(),
      getDetail,
    }))
    const store = useAnnouncementsStore()

    await expect(store.loadDetail(context, 5)).resolves.toBe(true)

    expect(getDetail).toHaveBeenCalledWith(context, 5)
    expect(store.selectedAnnouncement?.title).toBe("Welcome")
    expect(cache.detail?.data).toEqual(detailSnapshot)
  })

  it("shows an access error when no cached list exists", async () => {
    prepareAuthenticatedStores()
    const cache = new MemoryAnnouncementsCache()
    setAnnouncementsDependenciesForTests(cache, () => ({
      getList: vi.fn().mockRejectedValue(new AnnouncementsServiceError("access_denied", "Denied")),
      getDetail: vi.fn(),
    }))
    const store = useAnnouncementsStore()

    await expect(store.loadList(context)).resolves.toBe(false)

    expect(store.listStatus).toBe("error")
    expect(store.listErrorCode).toBe("access_denied")
  })
})
