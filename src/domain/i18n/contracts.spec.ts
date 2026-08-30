import { describe, expect, it } from "vitest"

import {
  normalizeCourseLocaleConfiguration,
  normalizeLanguageCatalog,
  normalizePlatformLocaleConfiguration,
} from "@/domain/i18n/contracts"

describe("locale API contracts", () => {
  it("normalizes the platform language priorities exposed by Chamilo", () => {
    expect(
      normalizePlatformLocaleConfiguration({
        settings: {
          "language.platform_language": "es_MX",
          "language.language_priority_1": "course_lang",
          "language.language_priority_2": "user_profil_lang",
          "language.language_priority_3": "user_selected_lang",
          "language.language_priority_4": "platform_lang",
        },
      }),
    ).toEqual({
      platformLocale: "es_MX",
      priorities: ["course_lang", "user_profil_lang", "user_selected_lang", "platform_lang"],
    })
  })

  it("normalizes the per-course user-language switch", () => {
    expect(
      normalizeCourseLocaleConfiguration({ settings: { show_course_in_user_language: "1" } }),
    ).toEqual({ showCourseInUserLanguage: true })
  })

  it("derives parent relationships from the language resource tree", () => {
    expect(
      normalizeLanguageCatalog({
        "hydra:member": [
          {
            isocode: "es",
            available: true,
            subLanguages: [{ isocode: "es_123", available: true, subLanguages: [] }],
          },
          { isocode: "en_US", available: true, subLanguages: [] },
        ],
      }),
    ).toEqual({
      availableLocales: ["en_US", "es", "es_123"],
      parentByLocale: { es_123: "es" },
    })
  })
})
