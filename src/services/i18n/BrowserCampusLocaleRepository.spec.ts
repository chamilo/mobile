import { describe, expect, it } from "vitest"

import type { CampusLocaleCacheData } from "@/domain/i18n/types"
import { BrowserCampusLocaleRepository } from "@/services/i18n/BrowserCampusLocaleRepository"

const data: CampusLocaleCacheData = {
  platform: {
    platformLocale: "es",
    priorities: ["course_lang", "user_profil_lang", "user_selected_lang", "platform_lang"],
  },
  languageCatalog: {
    availableLocales: ["en_US", "es", "es_12"],
    parentByLocale: { es_12: "es" },
  },
  courses: {
    "42": { showCourseInUserLanguage: true },
  },
  fetchedAt: "2026-08-29T12:00:00.000Z",
}

describe("BrowserCampusLocaleRepository", () => {
  it("stores locale data in the campus settings namespace", () => {
    const storage = window.localStorage
    storage.clear()
    const repository = new BrowserCampusLocaleRepository(storage)

    repository.save("campus-a", data)

    expect(storage.key(0)).toContain("campus-a/settings/language-resolution-v1")
    expect(repository.load("campus-a")?.data).toEqual(data)
  })
})
