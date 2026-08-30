import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CampusLocaleCacheData } from "@/domain/i18n/types"
import type { CampusLocaleRepository } from "@/services/i18n/CampusLocaleRepository"
import {
  resetLocaleDependencies,
  setLocaleDependenciesForTests,
  useLocaleStore,
} from "@/stores/locale"

const campus: CampusProfile = {
  id: "campus-a",
  displayName: "Campus A",
  baseUrl: "https://campus.example",
  allowInsecureHttp: false,
  compatibilityStatus: "compatible",
  compatibilityCheckedAt: null,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
  lastUsedAt: null,
}

class MemoryRepository implements CampusLocaleRepository {
  data: CampusLocaleCacheData | null = null

  load() {
    return this.data
      ? { version: 1 as const, savedAt: "2026-08-29T00:00:00.000Z", data: this.data }
      : null
  }

  save(_campusId: string, data: CampusLocaleCacheData) {
    this.data = structuredClone(data)
  }

  clear() {
    this.data = null
  }
}

describe("locale store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetLocaleDependencies()
  })

  it("switches from user language outside a course to course language inside it", async () => {
    const repository = new MemoryRepository()
    setLocaleDependenciesForTests(repository, () => ({
      getPlatformConfiguration: async () => ({
        platformLocale: "en_US",
        priorities: ["course_lang", "user_profil_lang", "user_selected_lang", "platform_lang"],
      }),
      getAvailableLanguages: async () => ({
        availableLocales: ["en_US", "es", "fr_FR"],
        parentByLocale: {},
      }),
      getCourseConfiguration: async () => ({ showCourseInUserLanguage: false }),
    }))

    const store = useLocaleStore()
    store.activateCampus(campus)
    store.setUserLocale("es")
    await store.refreshCampusConfiguration(campus)

    expect(store.resolution.effectiveLocale).toBe("es")

    await store.setCourseContext(campus, 42, "fr_FR", true)

    expect(store.resolution.effectiveLocale).toBe("fr_FR")
    expect(store.interfaceLocale).toBe("fr-FR")
  })

  it("honors show_course_in_user_language for a course", async () => {
    const repository = new MemoryRepository()
    setLocaleDependenciesForTests(repository, () => ({
      getPlatformConfiguration: async () => ({
        platformLocale: "en_US",
        priorities: ["course_lang", "user_profil_lang", "user_selected_lang", "platform_lang"],
      }),
      getAvailableLanguages: async () => ({
        availableLocales: ["en_US", "es", "fr_FR"],
        parentByLocale: {},
      }),
      getCourseConfiguration: async () => ({ showCourseInUserLanguage: true }),
    }))

    const store = useLocaleStore()
    store.activateCampus(campus)
    store.setUserLocale("es")
    await store.setCourseContext(campus, 42, "fr_FR", true)

    expect(store.resolution.effectiveLocale).toBe("es")
  })

  it("retries an incomplete platform configuration refresh", async () => {
    const repository = new MemoryRepository()
    let languageCalls = 0
    setLocaleDependenciesForTests(repository, () => ({
      getPlatformConfiguration: async () => ({
        platformLocale: "en_US",
        priorities: ["course_lang", "user_profil_lang", "user_selected_lang", "platform_lang"],
      }),
      getAvailableLanguages: async () => {
        languageCalls += 1
        if (languageCalls === 1) throw new Error("temporary language catalog failure")

        return {
          availableLocales: ["en_US", "es"],
          parentByLocale: {},
        }
      },
      getCourseConfiguration: async () => ({ showCourseInUserLanguage: false }),
    }))

    const store = useLocaleStore()
    store.activateCampus(campus)

    await store.refreshCampusConfiguration(campus)
    await store.refreshCampusConfiguration(campus)

    expect(languageCalls).toBe(2)
    expect(store.languageCatalog.availableLocales).toEqual(["en_US", "es"])
  })
})
