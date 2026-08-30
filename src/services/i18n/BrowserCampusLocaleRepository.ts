import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import type {
  CampusLocaleCacheData,
  CampusLocaleCacheRecord,
  ChamiloLanguagePriority,
  CourseLocaleConfiguration,
  LanguageCatalog,
  PlatformLocaleConfiguration,
} from "@/domain/i18n/types"
import {
  CampusLocaleRepositoryError,
  type CampusLocaleRepository,
} from "@/services/i18n/CampusLocaleRepository"

const STORAGE_PREFIX = "chamilo-mobile/"
const LOCALE_KEY = "language-resolution-v1"
const PRIORITIES = new Set<ChamiloLanguagePriority>([
  "course_lang",
  "user_profil_lang",
  "user_selected_lang",
  "platform_lang",
])

function buildStorageKey(campusId: string): string {
  return `${STORAGE_PREFIX}${buildCampusNamespace(campusId, "settings", LOCALE_KEY)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isPlatform(value: unknown): value is PlatformLocaleConfiguration {
  if (
    !isRecord(value) ||
    typeof value.platformLocale !== "string" ||
    !Array.isArray(value.priorities)
  ) {
    return false
  }

  return value.priorities.every((priority) => PRIORITIES.has(priority as ChamiloLanguagePriority))
}

function isCatalog(value: unknown): value is LanguageCatalog {
  return (
    isRecord(value) &&
    Array.isArray(value.availableLocales) &&
    value.availableLocales.every((locale) => typeof locale === "string") &&
    isRecord(value.parentByLocale) &&
    Object.values(value.parentByLocale).every((locale) => typeof locale === "string")
  )
}

function isCourse(value: unknown): value is CourseLocaleConfiguration {
  return isRecord(value) && typeof value.showCourseInUserLanguage === "boolean"
}

function isData(value: unknown): value is CampusLocaleCacheData {
  if (
    !isRecord(value) ||
    !isPlatform(value.platform) ||
    !isCatalog(value.languageCatalog) ||
    !isRecord(value.courses) ||
    typeof value.fetchedAt !== "string"
  ) {
    return false
  }

  return Object.values(value.courses).every(isCourse)
}

function isRecordValue(value: unknown): value is CampusLocaleCacheRecord {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.savedAt === "string" &&
    isData(value.data)
  )
}

export class BrowserCampusLocaleRepository implements CampusLocaleRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(campusId: string): CampusLocaleCacheRecord | null {
    try {
      const serialized = this.storage.getItem(buildStorageKey(campusId))
      if (!serialized) return null

      const parsed: unknown = JSON.parse(serialized)
      if (!isRecordValue(parsed)) {
        this.storage.removeItem(buildStorageKey(campusId))
        return null
      }

      return structuredClone(parsed)
    } catch (error) {
      throw new CampusLocaleRepositoryError("load", error)
    }
  }

  save(campusId: string, data: CampusLocaleCacheData): void {
    try {
      const record: CampusLocaleCacheRecord = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: structuredClone(data),
      }
      this.storage.setItem(buildStorageKey(campusId), JSON.stringify(record))
    } catch (error) {
      throw new CampusLocaleRepositoryError("save", error)
    }
  }

  clear(campusId: string): void {
    try {
      this.storage.removeItem(buildStorageKey(campusId))
    } catch (error) {
      throw new CampusLocaleRepositoryError("clear", error)
    }
  }
}

export const browserCampusLocaleRepository = new BrowserCampusLocaleRepository()
