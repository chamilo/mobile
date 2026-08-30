import { describe, expect, it } from "vitest"

import {
  findBestAvailableLocale,
  normalizeChamiloLocale,
  resolveLocale,
  toBcp47Locale,
} from "@/domain/i18n/locale"
import type { LanguageCatalog } from "@/domain/i18n/types"

const catalog: LanguageCatalog = {
  availableLocales: ["en_US", "es", "es_MX", "fr_FR", "fr_BE", "es_123"],
  parentByLocale: {
    es_123: "es",
  },
}

describe("Chamilo locale resolution", () => {
  it("normalizes regional and custom Chamilo locale identifiers", () => {
    expect(normalizeChamiloLocale("es-mx")).toBe("es_MX")
    expect(normalizeChamiloLocale("FR_be")).toBe("fr_BE")
    expect(normalizeChamiloLocale("es_123")).toBe("es_123")
    expect(toBcp47Locale("es_123")).toBe("es")
  })

  it("matches device locales using Chamilo exact, short and prefix rules", () => {
    expect(findBestAvailableLocale("es-MX", catalog)).toBe("es_MX")
    expect(findBestAvailableLocale("fr-CA", catalog)).toBe("fr_FR")
  })

  it("uses the course language before the user language with Chamilo defaults", () => {
    const resolved = resolveLocale({
      platformLocale: "en_US",
      userLocale: "es",
      courseActive: true,
      courseLocale: "fr_FR",
      languageCatalog: catalog,
    })

    expect(resolved.effectiveLocale).toBe("fr_FR")
    expect(resolved.interfaceLocale).toBe("fr-FR")
    expect(resolved.source).toBe("course")
  })

  it("uses the user locale as course locale when the course setting allows it", () => {
    const resolved = resolveLocale({
      platformLocale: "en_US",
      userLocale: "es_MX",
      courseActive: true,
      courseLocale: "fr_FR",
      showCourseInUserLanguage: true,
      languageCatalog: catalog,
    })

    expect(resolved.effectiveLocale).toBe("es_MX")
    expect(resolved.interfaceLocale).toBe("es-MX")
    expect(resolved.interfaceBundleLocale).toBe("es")
    expect(resolved.source).toBe("user")
  })

  it("uses the user profile language outside a course", () => {
    const resolved = resolveLocale({
      platformLocale: "fr_FR",
      userLocale: "es",
      courseActive: false,
      deviceLocales: ["fr-FR"],
      languageCatalog: catalog,
    })

    expect(resolved.effectiveLocale).toBe("es")
    expect(resolved.source).toBe("user")
  })

  it(
    "lets the device language replace platform language only when no stronger candidate follows",
    () => {
      const resolved = resolveLocale({
        platformLocale: "en_US",
        priorities: ["platform_lang"],
        deviceLocales: ["fr-FR"],
        languageCatalog: catalog,
      })

      expect(resolved.effectiveLocale).toBe("fr_FR")
      expect(resolved.source).toBe("device")
    },
  )

  it("builds sublanguage fallback through its parent and then English", () => {
    const resolved = resolveLocale({
      userLocale: "es_123",
      languageCatalog: catalog,
    })

    expect(resolved.contentLocale).toBe("es_123")
    expect(resolved.contentFallbackLocales).toEqual(["es", "en_US"])
    expect(resolved.interfaceLocale).toBe("es")
  })

  it("falls back to the bundled English interface for unsupported languages", () => {
    const resolved = resolveLocale({
      userLocale: "de",
      languageCatalog: { availableLocales: ["de", "en_US"], parentByLocale: {} },
    })

    expect(resolved.effectiveLocale).toBe("de")
    expect(resolved.interfaceLocale).toBe("en-US")
    expect(resolved.interfaceBundleLocale).toBe("en-US")
  })
})
