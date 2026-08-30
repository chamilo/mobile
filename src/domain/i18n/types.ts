export type ChamiloLanguagePriority =
  | "course_lang"
  | "user_profil_lang"
  | "user_selected_lang"
  | "platform_lang"

export type LocaleSource =
  | "course"
  | "user"
  | "selected"
  | "platform"
  | "device"
  | "default"

export interface PlatformLocaleConfiguration {
  platformLocale: string
  priorities: ChamiloLanguagePriority[]
}

export interface CourseLocaleConfiguration {
  showCourseInUserLanguage: boolean
}

export interface LanguageCatalog {
  availableLocales: string[]
  parentByLocale: Record<string, string>
}

export interface LocaleResolutionInput {
  defaultLocale?: string
  platformLocale?: string | null
  priorities?: ChamiloLanguagePriority[]
  userLocale?: string | null
  selectedLocale?: string | null
  deviceLocales?: string[]
  courseActive?: boolean
  courseLocale?: string | null
  showCourseInUserLanguage?: boolean
  languageCatalog?: LanguageCatalog
}

export interface LocaleResolution {
  effectiveLocale: string
  contentLocale: string
  contentFallbackLocales: string[]
  interfaceLocale: string
  interfaceBundleLocale: "en-US" | "es" | "fr-FR"
  source: LocaleSource
}

export interface CampusLocaleCacheData {
  platform: PlatformLocaleConfiguration
  languageCatalog: LanguageCatalog
  courses: Record<string, CourseLocaleConfiguration>
  fetchedAt: string
}

export interface CampusLocaleCacheRecord {
  version: 1
  savedAt: string
  data: CampusLocaleCacheData
}
