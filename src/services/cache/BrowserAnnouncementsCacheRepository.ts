import { buildAnnouncementContextKey } from "@/domain/announcements/context"
import type {
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
} from "@/domain/announcements/types"
import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { AnnouncementsCacheRepository } from "@/services/cache/AnnouncementsCacheRepository"
import { CampusCacheError, type CacheRecord } from "@/services/cache/CampusCacheRepository"

const STORAGE_PREFIX = "chamilo-mobile/"

function buildStorageKey(campusId: string, childKey: string): string {
  return `${STORAGE_PREFIX}${buildCampusNamespace(campusId, "cache", childKey)}`
}

function assertUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("User ID must be a positive integer.")
  }
}

function buildListKey(userId: number, context: CourseNavigationContext): string {
  assertUserId(userId)

  return `announcements-user-${userId}-${buildAnnouncementContextKey(context)}-list-v1`
}

function buildDetailKey(
  userId: number,
  context: CourseNavigationContext,
  announcementId: number,
): string {
  assertUserId(userId)

  if (!Number.isInteger(announcementId) || announcementId <= 0) {
    throw new Error("Announcement ID must be a positive integer.")
  }

  return `announcements-user-${userId}-${buildAnnouncementContextKey(context)}-item-${announcementId}-v1`
}

function isCacheRecord<TData>(
  value: unknown,
  dataValidator: (data: unknown) => data is TData,
): value is CacheRecord<TData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<CacheRecord<TData>>

  return (
    candidate.version === 1 &&
    typeof candidate.savedAt === "string" &&
    dataValidator(candidate.data)
  )
}

function isListSnapshot(value: unknown): value is AnnouncementListSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<AnnouncementListSnapshot>

  return (
    Array.isArray(candidate.items) &&
    typeof candidate.totalItems === "number" &&
    typeof candidate.fetchedAt === "string" &&
    Boolean(candidate.context)
  )
}

function isDetailSnapshot(value: unknown): value is AnnouncementDetailSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<AnnouncementDetailSnapshot>

  return (
    Boolean(candidate.item) && typeof candidate.fetchedAt === "string" && Boolean(candidate.context)
  )
}

export class BrowserAnnouncementsCacheRepository implements AnnouncementsCacheRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  loadList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): CacheRecord<AnnouncementListSnapshot> | null {
    return this.loadRecord(buildStorageKey(campusId, buildListKey(userId, context)), isListSnapshot)
  }

  saveList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    snapshot: AnnouncementListSnapshot,
  ): void {
    this.saveRecord(buildStorageKey(campusId, buildListKey(userId, context)), snapshot)
  }

  loadDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    announcementId: number,
  ): CacheRecord<AnnouncementDetailSnapshot> | null {
    return this.loadRecord(
      buildStorageKey(campusId, buildDetailKey(userId, context, announcementId)),
      isDetailSnapshot,
    )
  }

  saveDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    snapshot: AnnouncementDetailSnapshot,
  ): void {
    this.saveRecord(
      buildStorageKey(campusId, buildDetailKey(userId, context, snapshot.item.id)),
      snapshot,
    )
  }

  private loadRecord<TData>(
    key: string,
    validator: (data: unknown) => data is TData,
  ): CacheRecord<TData> | null {
    try {
      const serialized = this.storage.getItem(key)

      if (!serialized) {
        return null
      }

      const parsed: unknown = JSON.parse(serialized)

      if (!isCacheRecord(parsed, validator)) {
        this.storage.removeItem(key)
        return null
      }

      return structuredClone(parsed)
    } catch (error) {
      throw new CampusCacheError("load", error)
    }
  }

  private saveRecord<TData>(key: string, data: TData): void {
    try {
      const record: CacheRecord<TData> = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: structuredClone(data),
      }

      this.storage.setItem(key, JSON.stringify(record))
    } catch (error) {
      throw new CampusCacheError("save", error)
    }
  }
}

export const browserAnnouncementsCacheRepository = new BrowserAnnouncementsCacheRepository()
