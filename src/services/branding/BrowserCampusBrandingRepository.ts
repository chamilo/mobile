import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import type { CampusBranding, CampusBrandingCacheRecord } from "@/domain/branding/types"
import {
  CampusBrandingRepositoryError,
  type CampusBrandingRepository,
} from "@/services/branding/CampusBrandingRepository"

const STORAGE_PREFIX = "chamilo-mobile/"
const BRANDING_KEY = "platform-branding-v1"

function buildStorageKey(campusId: string): string {
  return `${STORAGE_PREFIX}${buildCampusNamespace(campusId, "settings", BRANDING_KEY)}`
}

function isBranding(value: unknown): value is CampusBranding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const candidate = value as Partial<CampusBranding>

  return (
    typeof candidate.siteName === "string" &&
    typeof candidate.logoUrl === "string" &&
    typeof candidate.visualTheme === "string" &&
    (candidate.source === "configured" || candidate.source === "theme") &&
    typeof candidate.fetchedAt === "string"
  )
}

function isCacheRecord(value: unknown): value is CampusBrandingCacheRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const candidate = value as Partial<CampusBrandingCacheRecord>

  return (
    candidate.version === 1 && typeof candidate.savedAt === "string" && isBranding(candidate.data)
  )
}

export class BrowserCampusBrandingRepository implements CampusBrandingRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(campusId: string): CampusBrandingCacheRecord | null {
    const storageKey = buildStorageKey(campusId)

    try {
      const serialized = this.storage.getItem(storageKey)
      if (!serialized) return null

      const parsed: unknown = JSON.parse(serialized)

      if (!isCacheRecord(parsed)) {
        this.storage.removeItem(storageKey)
        return null
      }

      return structuredClone(parsed)
    } catch (error) {
      throw new CampusBrandingRepositoryError("load", error)
    }
  }

  save(campusId: string, branding: CampusBranding): void {
    try {
      const record: CampusBrandingCacheRecord = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: structuredClone(branding),
      }

      this.storage.setItem(buildStorageKey(campusId), JSON.stringify(record))
    } catch (error) {
      throw new CampusBrandingRepositoryError("save", error)
    }
  }

  clear(campusId: string): void {
    try {
      this.storage.removeItem(buildStorageKey(campusId))
    } catch (error) {
      throw new CampusBrandingRepositoryError("clear", error)
    }
  }
}

export const browserCampusBrandingRepository = new BrowserCampusBrandingRepository()
