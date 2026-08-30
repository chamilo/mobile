import type {
  ChamiloLanguagePriority,
  LanguageCatalog,
  LocaleResolution,
  LocaleResolutionInput,
  LocaleSource,
} from "@/domain/i18n/types"

export const DEFAULT_CHAMILO_LOCALE = "en_US"
export const DEFAULT_LANGUAGE_PRIORITIES: ChamiloLanguagePriority[] = [
  "course_lang",
  "user_profil_lang",
  "user_selected_lang",
  "platform_lang",
]

const SUPPORTED_INTERFACE_BASES = new Set(["en", "es", "fr"])

export function normalizeChamiloLocale(value: string | null | undefined): string {
  const raw = String(value ?? "")
    .trim()
    .replace(/-/g, "_")

  if (!raw) return ""

  const regional = raw.match(/^([A-Za-z]{2,3})_([A-Za-z]{2})$/)
  if (regional?.[1] && regional[2]) {
    return `${regional[1].toLowerCase()}_${regional[2].toUpperCase()}`
  }

  const custom = raw.match(/^([A-Za-z]{2,3})_(.+)$/)
  if (custom?.[1] && custom[2]) {
    return `${custom[1].toLowerCase()}_${custom[2]}`
  }

  if (/^[A-Za-z]{2,3}$/.test(raw)) {
    return raw.toLowerCase()
  }

  return raw
}

export function baseLocale(value: string | null | undefined): string {
  const normalized = normalizeChamiloLocale(value)
  return normalized.split("_")[0]?.toLowerCase() ?? ""
}

export function toBcp47Locale(value: string | null | undefined): string {
  const normalized = normalizeChamiloLocale(value)
  const base = baseLocale(normalized)

  if (!base) return "en-US"

  const regional = normalized.match(/^([a-z]{2,3})_([A-Z]{2})$/)
  if (regional?.[1] && regional[2]) {
    return `${regional[1]}-${regional[2]}`
  }

  return base
}

function normalizedAvailableLocales(catalog: LanguageCatalog): string[] {
  return catalog.availableLocales
    .map((locale) => normalizeChamiloLocale(locale))
    .filter(Boolean)
    .filter((locale, index, values) => values.indexOf(locale) === index)
}

export function findBestAvailableLocale(
  value: string | null | undefined,
  catalog: LanguageCatalog,
): string | null {
  const normalized = normalizeChamiloLocale(value)
  if (!normalized) return null

  const available = normalizedAvailableLocales(catalog)
  if (available.length === 0) return normalized

  if (available.includes(normalized)) return normalized

  const short = baseLocale(normalized)
  if (available.includes(short)) return short

  if (short.length === 2) {
    const canonical = `${short}_${short.toUpperCase()}`
    if (available.includes(canonical)) return canonical
  }

  return available
    .filter((locale) => locale.startsWith(`${short}_`))
    .sort((left, right) => left.localeCompare(right))[0] ?? null
}

function resolveDeviceLocale(deviceLocales: string[], catalog: LanguageCatalog): string | null {
  for (const candidate of deviceLocales) {
    const match = findBestAvailableLocale(candidate, catalog)
    if (match) return match
  }

  return null
}

function normalizePriorities(
  priorities: ChamiloLanguagePriority[] | undefined,
): ChamiloLanguagePriority[] {
  const allowed = new Set<ChamiloLanguagePriority>(DEFAULT_LANGUAGE_PRIORITIES)
  const normalized = (priorities ?? []).filter(
    (priority, index, values) => allowed.has(priority) && values.indexOf(priority) === index,
  )

  return normalized.length > 0 ? normalized : [...DEFAULT_LANGUAGE_PRIORITIES]
}

function pickEffectiveLocale(input: LocaleResolutionInput): {
  locale: string
  source: LocaleSource
} {
  const fallback = normalizeChamiloLocale(input.defaultLocale) || DEFAULT_CHAMILO_LOCALE
  const platform = normalizeChamiloLocale(input.platformLocale)
  const user = normalizeChamiloLocale(input.userLocale)
  const selected = normalizeChamiloLocale(input.selectedLocale)
  const courseConfigured = normalizeChamiloLocale(input.courseLocale)
  const course = input.courseActive
    ? input.showCourseInUserLanguage && user
      ? user
      : courseConfigured
    : ""
  const catalog = input.languageCatalog ?? { availableLocales: [], parentByLocale: {} }
  const device = user ? "" : (resolveDeviceLocale(input.deviceLocales ?? [], catalog) ?? "")

  const candidates: Record<ChamiloLanguagePriority, { locale: string; source: LocaleSource }> = {
    platform_lang: { locale: platform, source: "platform" },
    user_profil_lang: { locale: user, source: "user" },
    user_selected_lang: { locale: selected, source: "selected" },
    course_lang: {
      locale: course,
      source: input.courseActive && input.showCourseInUserLanguage && user ? "user" : "course",
    },
  }

  const matching = normalizePriorities(input.priorities).filter(
    (priority) => Boolean(candidates[priority].locale),
  )

  for (let index = 0; index < matching.length; index += 1) {
    const priority = matching[index]
    if (!priority) continue

    if (priority === "platform_lang" && device) {
      if (!matching[index + 1]) {
        return { locale: device, source: "device" }
      }

      continue
    }

    const candidate = candidates[priority]
    if (candidate.locale) return candidate
  }

  let result = { locale: fallback, source: "default" as LocaleSource }
  const fallbackOrder: Array<{ locale: string; source: LocaleSource }> = [
    { locale: platform, source: "platform" },
    { locale: device, source: "device" },
    { locale: user, source: "user" },
    { locale: course, source: input.showCourseInUserLanguage && user ? "user" : "course" },
    { locale: selected, source: "selected" },
  ]

  for (const candidate of fallbackOrder) {
    if (candidate.locale) result = candidate
  }

  return result
}

function buildContentFallbackLocales(locale: string, catalog: LanguageCatalog): string[] {
  const normalized = normalizeChamiloLocale(locale)
  const fallbacks: string[] = []
  const visited = new Set<string>([normalized])
  let current = normalized

  function add(value: string): void {
    const candidate = normalizeChamiloLocale(value)
    if (candidate && !visited.has(candidate)) {
      visited.add(candidate)
      fallbacks.push(candidate)
    }
  }

  while (current) {
    const parent = normalizeChamiloLocale(catalog.parentByLocale[current])
    if (!parent || visited.has(parent)) break
    add(parent)
    current = parent
  }

  const short = baseLocale(normalized)
  if (normalized.includes("_") && short) add(short)

  if (normalized !== DEFAULT_CHAMILO_LOCALE) add(DEFAULT_CHAMILO_LOCALE)

  return fallbacks
}

function resolveInterfaceLocale(effectiveLocale: string): {
  locale: string
  bundleLocale: "en-US" | "es" | "fr-FR"
} {
  const normalized = normalizeChamiloLocale(effectiveLocale)
  const short = baseLocale(normalized)

  if (!SUPPORTED_INTERFACE_BASES.has(short)) {
    return { locale: "en-US", bundleLocale: "en-US" }
  }

  if (short === "es") {
    const regional = normalized.match(/^es_([A-Z]{2})$/)
    return {
      locale: regional?.[1] ? `es-${regional[1]}` : "es",
      bundleLocale: "es",
    }
  }

  if (short === "fr") {
    const regional = normalized.match(/^fr_([A-Z]{2})$/)
    return {
      locale: regional?.[1] ? `fr-${regional[1]}` : "fr-FR",
      bundleLocale: "fr-FR",
    }
  }

  const regional = normalized.match(/^en_([A-Z]{2})$/)
  return {
    locale: regional?.[1] ? `en-${regional[1]}` : "en-US",
    bundleLocale: "en-US",
  }
}

export function resolveLocale(input: LocaleResolutionInput): LocaleResolution {
  const picked = pickEffectiveLocale(input)
  const effectiveLocale = normalizeChamiloLocale(picked.locale) || DEFAULT_CHAMILO_LOCALE
  const catalog = input.languageCatalog ?? { availableLocales: [], parentByLocale: {} }
  const interfaceResolution = resolveInterfaceLocale(effectiveLocale)

  return {
    effectiveLocale,
    contentLocale: effectiveLocale,
    contentFallbackLocales: buildContentFallbackLocales(effectiveLocale, catalog),
    interfaceLocale: interfaceResolution.locale,
    interfaceBundleLocale: interfaceResolution.bundleLocale,
    source: picked.source,
  }
}

export function getDeviceLocales(): string[] {
  if (typeof navigator === "undefined") return []

  const values = Array.isArray(navigator.languages) ? navigator.languages : []
  const fallback = typeof navigator.language === "string" ? [navigator.language] : []

  return [...values, ...fallback]
    .map((value) => String(value).trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
}
