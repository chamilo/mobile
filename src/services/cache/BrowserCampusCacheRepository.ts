import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import type { CoursesOverview } from "@/domain/courses/types"
import {
  CampusCacheError,
  type CacheRecord,
  type CampusCacheRepository,
} from "@/services/cache/CampusCacheRepository"

const STORAGE_PREFIX = "chamilo-mobile/"

function buildStorageKey(campusId: string, childKey: string): string {
  return `${STORAGE_PREFIX}${buildCampusNamespace(campusId, "cache", childKey)}`
}

function isCoursesCacheRecord(value: unknown): value is CacheRecord<CoursesOverview> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<CacheRecord<CoursesOverview>>
  const data = candidate.data as Partial<CoursesOverview> | undefined

  return (
    candidate.version === 1 &&
    typeof candidate.savedAt === "string" &&
    Boolean(data) &&
    typeof data?.fetchedAt === "string" &&
    Array.isArray(data.directCourses) &&
    Array.isArray(data.currentSessions) &&
    Array.isArray(data.upcomingSessions) &&
    Array.isArray(data.pastSessions)
  )
}

function buildCoursesCacheKey(userId: number): string {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("User ID must be a positive integer.")
  }

  return `courses-user-${userId}-v1`
}

export class BrowserCampusCacheRepository implements CampusCacheRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  loadCourses(campusId: string, userId: number): CacheRecord<CoursesOverview> | null {
    try {
      const serialized = this.storage.getItem(
        buildStorageKey(campusId, buildCoursesCacheKey(userId)),
      )

      if (!serialized) {
        return null
      }

      const parsed: unknown = JSON.parse(serialized)

      if (!isCoursesCacheRecord(parsed)) {
        this.storage.removeItem(buildStorageKey(campusId, buildCoursesCacheKey(userId)))

        return null
      }

      return structuredClone(parsed)
    } catch (error) {
      throw new CampusCacheError("load", error)
    }
  }

  saveCourses(campusId: string, userId: number, overview: CoursesOverview): void {
    try {
      const record: CacheRecord<CoursesOverview> = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: structuredClone(overview),
      }

      this.storage.setItem(
        buildStorageKey(campusId, buildCoursesCacheKey(userId)),
        JSON.stringify(record),
      )
    } catch (error) {
      throw new CampusCacheError("save", error)
    }
  }

  clearCampus(campusId: string): void {
    try {
      const prefix = `${STORAGE_PREFIX}${buildCampusNamespace(campusId, "cache")}/`
      const keysToRemove: string[] = []

      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index)

        if (key?.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach((key) => this.storage.removeItem(key))
    } catch (error) {
      throw new CampusCacheError("clear", error)
    }
  }
}

export const browserCampusCacheRepository = new BrowserCampusCacheRepository()
