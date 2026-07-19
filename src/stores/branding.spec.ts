import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { CampusBranding } from "@/domain/branding/types"
import type { CampusProfile } from "@/domain/campus/types"
import type { CampusBrandingRepository } from "@/services/branding/CampusBrandingRepository"
import {
  resetBrandingDependencies,
  setBrandingDependenciesForTests,
  useBrandingStore,
} from "@/stores/branding"

const campus: CampusProfile = {
  id: "campus-1",
  displayName: "Local Chamilo",
  baseUrl: "https://chamilo2.local",
  allowInsecureHttp: false,
  compatibilityStatus: "compatible",
  compatibilityCheckedAt: null,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastUsedAt: null,
}

const cachedBranding: CampusBranding = {
  siteName: "Cached Campus",
  logoUrl: "https://chamilo2.local/themes/chamilo/logo/header",
  visualTheme: "chamilo",
  source: "theme",
  fetchedAt: "2026-07-19T09:00:00.000Z",
}

function createRepository(cached: CampusBranding | null): CampusBrandingRepository {
  return {
    load: () =>
      cached
        ? {
            version: 1,
            savedAt: "2026-07-19T09:00:00.000Z",
            data: cached,
          }
        : null,
    save: () => undefined,
    clear: () => undefined,
  }
}

describe("branding store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetBrandingDependencies()
  })

  it("refreshes cached branding from the selected campus", async () => {
    const remoteBranding: CampusBranding = {
      ...cachedBranding,
      siteName: "Fresh Campus",
      fetchedAt: "2026-07-19T10:00:00.000Z",
    }

    setBrandingDependenciesForTests(createRepository(cachedBranding), () => ({
      getBranding: async () => remoteBranding,
    }))

    const store = useBrandingStore()

    await expect(store.load(campus)).resolves.toBe(true)
    expect(store.status).toBe("ready")
    expect(store.branding?.siteName).toBe("Fresh Campus")
  })

  it("keeps cached branding when the campus request fails", async () => {
    setBrandingDependenciesForTests(createRepository(cachedBranding), () => ({
      getBranding: async () => {
        throw new Error("offline")
      },
    }))

    const store = useBrandingStore()

    await expect(store.load(campus)).resolves.toBe(true)
    expect(store.status).toBe("ready")
    expect(store.branding?.siteName).toBe("Cached Campus")
  })

  it("falls back to the header initials when no branding can be loaded", async () => {
    setBrandingDependenciesForTests(createRepository(null), () => ({
      getBranding: async () => {
        throw new Error("offline")
      },
    }))

    const store = useBrandingStore()

    await expect(store.load(campus)).resolves.toBe(false)
    expect(store.status).toBe("error")
    expect(store.branding).toBeNull()
  })
})
