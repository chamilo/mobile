import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import {
  DEFAULT_CHAMILO_LOCALE,
  DEFAULT_LANGUAGE_PRIORITIES,
  getDeviceLocales,
  resolveLocale,
} from "@/domain/i18n/locale"
import type {
  CampusLocaleCacheData,
  CourseLocaleConfiguration,
  LanguageCatalog,
  LocaleResolution,
  PlatformLocaleConfiguration,
} from "@/domain/i18n/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { browserCampusLocaleRepository } from "@/services/i18n/BrowserCampusLocaleRepository"
import type { CampusLocaleRepository } from "@/services/i18n/CampusLocaleRepository"
import { LocaleConfigurationApiService } from "@/services/i18n/LocaleConfigurationApiService"

export type LocaleConfigurationApi = Pick<
  LocaleConfigurationApiService,
  "getPlatformConfiguration" | "getAvailableLanguages" | "getCourseConfiguration"
>
export type LocaleConfigurationApiFactory = (campus: CampusProfile) => LocaleConfigurationApi

let repository: CampusLocaleRepository = browserCampusLocaleRepository
let apiFactory: LocaleConfigurationApiFactory = (campus) =>
  new LocaleConfigurationApiService(createAuthenticatedHttpClient(campus))

export function setLocaleDependenciesForTests(
  testRepository: CampusLocaleRepository,
  testApiFactory: LocaleConfigurationApiFactory,
): void {
  repository = testRepository
  apiFactory = testApiFactory
}

export function resetLocaleDependencies(): void {
  repository = browserCampusLocaleRepository
  apiFactory = (campus) => new LocaleConfigurationApiService(createAuthenticatedHttpClient(campus))
}

function defaultPlatform(): PlatformLocaleConfiguration {
  return {
    platformLocale: DEFAULT_CHAMILO_LOCALE,
    priorities: [...DEFAULT_LANGUAGE_PRIORITIES],
  }
}

function emptyCatalog(): LanguageCatalog {
  return { availableLocales: [], parentByLocale: {} }
}

export const useLocaleStore = defineStore("locale", () => {
  const campusId = ref<string | null>(null)
  const platform = ref<PlatformLocaleConfiguration>(defaultPlatform())
  const languageCatalog = ref<LanguageCatalog>(emptyCatalog())
  const courseConfigurations = ref<Record<string, CourseLocaleConfiguration>>({})
  const userLocale = ref<string | null>(null)
  const selectedLocale = ref<string | null>(null)
  const deviceLocales = ref<string[]>(getDeviceLocales())
  const courseId = ref<number | null>(null)
  const courseLocale = ref<string | null>(null)
  const showCourseInUserLanguage = ref(false)
  const remotePlatformCampusId = ref<string | null>(null)
  const remoteCourseKeys = new Set<string>()

  const resolution = computed<LocaleResolution>(() =>
    resolveLocale({
      platformLocale: platform.value.platformLocale,
      priorities: platform.value.priorities,
      userLocale: userLocale.value,
      selectedLocale: selectedLocale.value,
      deviceLocales: deviceLocales.value,
      courseActive: courseId.value !== null,
      courseLocale: courseLocale.value,
      showCourseInUserLanguage: showCourseInUserLanguage.value,
      languageCatalog: languageCatalog.value,
    }),
  )

  const interfaceLocale = computed(() => resolution.value.interfaceLocale)
  const interfaceBundleLocale = computed(() => resolution.value.interfaceBundleLocale)
  const contentLocale = computed(() => resolution.value.contentLocale)
  const contentFallbackLocales = computed(() => resolution.value.contentFallbackLocales)

  function currentCacheData(): CampusLocaleCacheData {
    return {
      platform: structuredClone(platform.value),
      languageCatalog: structuredClone(languageCatalog.value),
      courses: structuredClone(courseConfigurations.value),
      fetchedAt: new Date().toISOString(),
    }
  }

  function persist(): void {
    if (!campusId.value) return

    try {
      repository.save(campusId.value, currentCacheData())
    } catch {
      // Locale cache is optional. Resolution continues with in-memory values.
    }
  }

  function activateCampus(campus: CampusProfile | null): void {
    if (!campus) {
      campusId.value = null
      platform.value = defaultPlatform()
      languageCatalog.value = emptyCatalog()
      courseConfigurations.value = {}
      userLocale.value = null
      selectedLocale.value = null
      courseId.value = null
      courseLocale.value = null
      showCourseInUserLanguage.value = false
      remotePlatformCampusId.value = null
      remoteCourseKeys.clear()
      return
    }

    if (campusId.value === campus.id) return

    campusId.value = campus.id
    platform.value = defaultPlatform()
    languageCatalog.value = emptyCatalog()
    courseConfigurations.value = {}
    userLocale.value = null
    selectedLocale.value = null
    courseId.value = null
    courseLocale.value = null
    showCourseInUserLanguage.value = false
    remotePlatformCampusId.value = null
    remoteCourseKeys.clear()

    try {
      const cached = repository.load(campus.id)?.data
      if (cached) {
        platform.value = cached.platform
        languageCatalog.value = cached.languageCatalog
        courseConfigurations.value = cached.courses
      }
    } catch {
      // Fall back to Chamilo defaults and device locale.
    }
  }

  function setUserLocale(locale: string | null): void {
    userLocale.value = locale
  }

  function setSelectedLocale(locale: string | null): void {
    selectedLocale.value = locale
  }

  function setDeviceLocales(locales: string[]): void {
    deviceLocales.value = [...locales]
  }

  async function refreshCampusConfiguration(campus: CampusProfile, force = false): Promise<void> {
    activateCampus(campus)

    if (!force && remotePlatformCampusId.value === campus.id) return

    const api = apiFactory(campus)
    const [platformResult, languagesResult] = await Promise.allSettled([
      api.getPlatformConfiguration(),
      api.getAvailableLanguages(),
    ])

    if (campusId.value !== campus.id) return

    if (platformResult.status === "fulfilled") platform.value = platformResult.value
    if (languagesResult.status === "fulfilled") languageCatalog.value = languagesResult.value

    if (platformResult.status === "fulfilled" || languagesResult.status === "fulfilled") {
      persist()
    }

    if (platformResult.status === "fulfilled" && languagesResult.status === "fulfilled") {
      remotePlatformCampusId.value = campus.id
    }
  }

  async function setCourseContext(
    campus: CampusProfile,
    nextCourseId: number,
    nextCourseLocale: string | null,
    online: boolean,
  ): Promise<void> {
    activateCampus(campus)

    courseId.value = nextCourseId
    courseLocale.value = nextCourseLocale
    showCourseInUserLanguage.value =
      courseConfigurations.value[String(nextCourseId)]?.showCourseInUserLanguage ?? false

    if (!online) return

    const remoteKey = `${campus.id}:${nextCourseId}`
    if (remoteCourseKeys.has(remoteKey)) return

    try {
      const configuration = await apiFactory(campus).getCourseConfiguration(nextCourseId)
      if (campusId.value !== campus.id || courseId.value !== nextCourseId) return

      courseConfigurations.value = {
        ...courseConfigurations.value,
        [String(nextCourseId)]: configuration,
      }
      showCourseInUserLanguage.value = configuration.showCourseInUserLanguage
      remoteCourseKeys.add(remoteKey)
      persist()
    } catch {
      // Cached/default course behavior remains usable and the request can retry later.
    }
  }

  function clearCourseContext(): void {
    courseId.value = null
    courseLocale.value = null
    showCourseInUserLanguage.value = false
  }

  function clearUserContext(): void {
    userLocale.value = null
    selectedLocale.value = null
    clearCourseContext()
  }

  return {
    campusId,
    platform,
    languageCatalog,
    userLocale,
    selectedLocale,
    deviceLocales,
    courseId,
    courseLocale,
    showCourseInUserLanguage,
    resolution,
    interfaceLocale,
    interfaceBundleLocale,
    contentLocale,
    contentFallbackLocales,
    activateCampus,
    setUserLocale,
    setSelectedLocale,
    setDeviceLocales,
    refreshCampusConfiguration,
    setCourseContext,
    clearCourseContext,
    clearUserContext,
  }
})
