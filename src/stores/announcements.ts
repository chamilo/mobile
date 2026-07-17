import { computed, onScopeDispose, ref } from "vue"
import { defineStore } from "pinia"

import { buildAnnouncementContextKey } from "@/domain/announcements/context"
import type {
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
} from "@/domain/announcements/types"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  AnnouncementsApiService,
  AnnouncementsServiceError,
  type AnnouncementsErrorCode,
} from "@/services/announcements/AnnouncementsApiService"
import { registerCampusSessionDataCleaner } from "@/services/auth/CampusSessionDataCleaner"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { browserAnnouncementsCacheRepository } from "@/services/cache/BrowserAnnouncementsCacheRepository"
import type { AnnouncementsCacheRepository } from "@/services/cache/AnnouncementsCacheRepository"
import { CampusCacheError } from "@/services/cache/CampusCacheRepository"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

export type AnnouncementsStatus = "idle" | "loading" | "ready" | "error"
export type AnnouncementsStoreErrorCode =
  | AnnouncementsErrorCode
  | "campus_required"
  | "offline"
  | "cache_failed"

export type AnnouncementsApi = Pick<AnnouncementsApiService, "getList" | "getDetail">
export type AnnouncementsApiFactory = (campus: CampusProfile) => AnnouncementsApi

let cacheRepository: AnnouncementsCacheRepository = browserAnnouncementsCacheRepository
let apiFactory: AnnouncementsApiFactory = (campus) =>
  new AnnouncementsApiService(createAuthenticatedHttpClient(campus))

export function setAnnouncementsDependenciesForTests(
  testCacheRepository: AnnouncementsCacheRepository,
  testApiFactory: AnnouncementsApiFactory,
): void {
  cacheRepository = testCacheRepository
  apiFactory = testApiFactory
}

export function resetAnnouncementsDependencies(): void {
  cacheRepository = browserAnnouncementsCacheRepository
  apiFactory = (campus) => new AnnouncementsApiService(createAuthenticatedHttpClient(campus))
}

function mapError(error: unknown): AnnouncementsStoreErrorCode {
  if (error instanceof AnnouncementsServiceError) {
    return error.code
  }

  if (error instanceof CampusCacheError) {
    return "cache_failed"
  }

  return "server"
}

export const useAnnouncementsStore = defineStore("announcements", () => {
  const listStatus = ref<AnnouncementsStatus>("idle")
  const detailStatus = ref<AnnouncementsStatus>("idle")
  const currentCampusId = ref<string | null>(null)
  const currentUserId = ref<number | null>(null)
  const currentContextKey = ref<string | null>(null)
  const listSnapshot = ref<AnnouncementListSnapshot | null>(null)
  const detailSnapshot = ref<AnnouncementDetailSnapshot | null>(null)
  const listErrorCode = ref<AnnouncementsStoreErrorCode | null>(null)
  const detailErrorCode = ref<AnnouncementsStoreErrorCode | null>(null)
  const isListStale = ref(false)
  const isDetailStale = ref(false)
  const isListRefreshing = ref(false)
  const isDetailRefreshing = ref(false)
  const listCacheSavedAt = ref<string | null>(null)
  const detailCacheSavedAt = ref<string | null>(null)

  const items = computed(() => listSnapshot.value?.items ?? [])
  const totalItems = computed(() => listSnapshot.value?.totalItems ?? 0)
  const selectedAnnouncement = computed(() => detailSnapshot.value?.item ?? null)

  function resetState(): void {
    listStatus.value = "idle"
    detailStatus.value = "idle"
    currentCampusId.value = null
    currentUserId.value = null
    currentContextKey.value = null
    listSnapshot.value = null
    detailSnapshot.value = null
    listErrorCode.value = null
    detailErrorCode.value = null
    isListStale.value = false
    isDetailStale.value = false
    isListRefreshing.value = false
    isDetailRefreshing.value = false
    listCacheSavedAt.value = null
    detailCacheSavedAt.value = null
  }

  function prepareContext(
    context: CourseNavigationContext,
  ): { campus: CampusProfile; userId: number } | null {
    const campus = useCampusStore().selectedCampus
    const profile = useAuthStore().profile

    if (!campus) {
      resetState()
      listStatus.value = "error"
      listErrorCode.value = "campus_required"
      return null
    }

    if (!profile) {
      resetState()
      currentCampusId.value = campus.id
      listStatus.value = "error"
      listErrorCode.value = "session_required"
      return null
    }

    const contextKey = buildAnnouncementContextKey(context)

    if (
      currentCampusId.value !== campus.id ||
      currentUserId.value !== profile.id ||
      currentContextKey.value !== contextKey
    ) {
      resetState()
      currentCampusId.value = campus.id
      currentUserId.value = profile.id
      currentContextKey.value = contextKey
    }

    return { campus, userId: profile.id }
  }

  async function loadList(context: CourseNavigationContext, force = false): Promise<boolean> {
    const prepared = prepareContext(context)

    if (!prepared) {
      return false
    }

    if (!force && listStatus.value === "ready" && !isListStale.value) {
      return true
    }

    let hasCache = false

    try {
      const cached = cacheRepository.loadList(prepared.campus.id, prepared.userId, context)

      if (cached) {
        listSnapshot.value = cached.data
        listCacheSavedAt.value = cached.savedAt
        listStatus.value = "ready"
        isListStale.value = true
        hasCache = true
      }
    } catch (error) {
      listErrorCode.value = mapError(error)
    }

    if (globalThis.navigator?.onLine === false) {
      listErrorCode.value = "offline"
      listStatus.value = hasCache ? "ready" : "error"
      return hasCache
    }

    if (hasCache) {
      isListRefreshing.value = true
    } else {
      listStatus.value = "loading"
    }

    listErrorCode.value = null

    try {
      const snapshot = await apiFactory(prepared.campus).getList(context)

      listSnapshot.value = snapshot
      listStatus.value = "ready"
      isListStale.value = false
      listCacheSavedAt.value = new Date().toISOString()

      try {
        cacheRepository.saveList(prepared.campus.id, prepared.userId, context, snapshot)
      } catch {
        listErrorCode.value = "cache_failed"
      }

      return true
    } catch (error) {
      listErrorCode.value = mapError(error)
      listStatus.value = hasCache ? "ready" : "error"
      isListStale.value = hasCache
      return hasCache
    } finally {
      isListRefreshing.value = false
    }
  }

  async function loadDetail(
    context: CourseNavigationContext,
    announcementId: number,
    force = false,
  ): Promise<boolean> {
    const prepared = prepareContext(context)

    if (!prepared) {
      detailStatus.value = "error"
      detailErrorCode.value = useCampusStore().selectedCampus
        ? "session_required"
        : "campus_required"
      return false
    }

    if (
      !force &&
      detailStatus.value === "ready" &&
      detailSnapshot.value?.item.id === announcementId &&
      !isDetailStale.value
    ) {
      return true
    }

    detailSnapshot.value = null
    detailStatus.value = "idle"
    detailErrorCode.value = null
    isDetailStale.value = false
    detailCacheSavedAt.value = null

    let hasCache = false

    try {
      const cached = cacheRepository.loadDetail(
        prepared.campus.id,
        prepared.userId,
        context,
        announcementId,
      )

      if (cached) {
        detailSnapshot.value = cached.data
        detailCacheSavedAt.value = cached.savedAt
        detailStatus.value = "ready"
        isDetailStale.value = true
        hasCache = true
      }
    } catch (error) {
      detailErrorCode.value = mapError(error)
    }

    if (globalThis.navigator?.onLine === false) {
      detailErrorCode.value = "offline"
      detailStatus.value = hasCache ? "ready" : "error"
      return hasCache
    }

    if (hasCache) {
      isDetailRefreshing.value = true
    } else {
      detailStatus.value = "loading"
    }

    detailErrorCode.value = null

    try {
      const snapshot = await apiFactory(prepared.campus).getDetail(context, announcementId)

      detailSnapshot.value = snapshot
      detailStatus.value = "ready"
      isDetailStale.value = false
      detailCacheSavedAt.value = new Date().toISOString()

      try {
        cacheRepository.saveDetail(prepared.campus.id, prepared.userId, context, snapshot)
      } catch {
        detailErrorCode.value = "cache_failed"
      }

      return true
    } catch (error) {
      detailErrorCode.value = mapError(error)
      detailStatus.value = hasCache ? "ready" : "error"
      isDetailStale.value = hasCache
      return hasCache
    } finally {
      isDetailRefreshing.value = false
    }
  }

  function clearDetail(): void {
    detailStatus.value = "idle"
    detailSnapshot.value = null
    detailErrorCode.value = null
    isDetailStale.value = false
    detailCacheSavedAt.value = null
  }

  const unregisterSessionCleaner = registerCampusSessionDataCleaner((campusId) => {
    if (currentCampusId.value === campusId) {
      resetState()
    }
  })
  onScopeDispose(unregisterSessionCleaner)

  return {
    listStatus,
    detailStatus,
    currentCampusId,
    currentUserId,
    currentContextKey,
    listSnapshot,
    detailSnapshot,
    listErrorCode,
    detailErrorCode,
    isListStale,
    isDetailStale,
    isListRefreshing,
    isDetailRefreshing,
    listCacheSavedAt,
    detailCacheSavedAt,
    items,
    totalItems,
    selectedAnnouncement,
    loadList,
    loadDetail,
    clearDetail,
    resetState,
  }
})
