import { describe, expect, it } from "vitest"

import { BrowserCampusBrandingRepository } from "@/services/branding/BrowserCampusBrandingRepository"

function createStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe("BrowserCampusBrandingRepository", () => {
  it("isolates branding settings by campus", () => {
    const repository = new BrowserCampusBrandingRepository(createStorage())

    repository.save("campus-a", {
      siteName: "Campus A",
      logoUrl: "https://a.test/themes/chamilo/logo/header",
      visualTheme: "chamilo",
      source: "theme",
      fetchedAt: "2026-07-19T10:00:00.000Z",
    })

    expect(repository.load("campus-a")?.data.siteName).toBe("Campus A")
    expect(repository.load("campus-b")).toBeNull()
  })

  it("clears only the selected campus branding", () => {
    const repository = new BrowserCampusBrandingRepository(createStorage())
    const branding = {
      siteName: "Campus",
      logoUrl: "https://campus.test/themes/chamilo/logo/header",
      visualTheme: "chamilo",
      source: "theme" as const,
      fetchedAt: "2026-07-19T10:00:00.000Z",
    }

    repository.save("campus-a", branding)
    repository.save("campus-b", branding)
    repository.clear("campus-a")

    expect(repository.load("campus-a")).toBeNull()
    expect(repository.load("campus-b")).not.toBeNull()
  })
})
