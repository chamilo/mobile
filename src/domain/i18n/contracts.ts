import {
  DEFAULT_CHAMILO_LOCALE,
  DEFAULT_LANGUAGE_PRIORITIES,
  normalizeChamiloLocale,
} from "@/domain/i18n/locale"
import type {
  ChamiloLanguagePriority,
  CourseLocaleConfiguration,
  LanguageCatalog,
  PlatformLocaleConfiguration,
} from "@/domain/i18n/types"

export class LocaleConfigurationContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LocaleConfigurationContractError"
  }
}

type UnknownRecord = Record<string, unknown>

const PRIORITIES = new Set<ChamiloLanguagePriority>(DEFAULT_LANGUAGE_PRIORITIES)

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function booleanSetting(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true"
}

export function normalizePlatformLocaleConfiguration(
  value: unknown,
): PlatformLocaleConfiguration {
  if (!isRecord(value)) {
    throw new LocaleConfigurationContractError("The platform configuration response is invalid.")
  }

  const settings = isRecord(value.settings) ? value.settings : {}
  const platformLocale =
    normalizeChamiloLocale(settings["language.platform_language"] as string | undefined) ||
    DEFAULT_CHAMILO_LOCALE
  const priorities: ChamiloLanguagePriority[] = []

  for (const key of [
    "language.language_priority_1",
    "language.language_priority_2",
    "language.language_priority_3",
    "language.language_priority_4",
  ]) {
    const priority = text(settings[key]) as ChamiloLanguagePriority
    if (PRIORITIES.has(priority) && !priorities.includes(priority)) priorities.push(priority)
  }

  return {
    platformLocale,
    priorities: priorities.length > 0 ? priorities : [...DEFAULT_LANGUAGE_PRIORITIES],
  }
}

export function normalizeCourseLocaleConfiguration(value: unknown): CourseLocaleConfiguration {
  if (!isRecord(value) || !isRecord(value.settings)) {
    throw new LocaleConfigurationContractError("The course settings response is invalid.")
  }

  return {
    showCourseInUserLanguage: booleanSetting(value.settings.show_course_in_user_language),
  }
}

function normalizeLanguageEntry(
  value: unknown,
  availableLocales: Set<string>,
  parentByLocale: Record<string, string>,
  parentLocale: string | null,
): void {
  if (!isRecord(value)) return

  const locale = normalizeChamiloLocale(text(value.isocode))
  if (!locale) return

  if (value.available !== false) availableLocales.add(locale)
  if (parentLocale) parentByLocale[locale] = parentLocale

  if (Array.isArray(value.subLanguages)) {
    for (const child of value.subLanguages) {
      normalizeLanguageEntry(child, availableLocales, parentByLocale, locale)
    }
  }
}

export function normalizeLanguageCatalog(value: unknown): LanguageCatalog {
  if (!isRecord(value) || !Array.isArray(value["hydra:member"])) {
    throw new LocaleConfigurationContractError("The languages response is not a Hydra collection.")
  }

  const availableLocales = new Set<string>()
  const parentByLocale: Record<string, string> = {}

  for (const item of value["hydra:member"]) {
    normalizeLanguageEntry(item, availableLocales, parentByLocale, null)
  }

  return {
    availableLocales: [...availableLocales].sort((left, right) => left.localeCompare(right)),
    parentByLocale,
  }
}
