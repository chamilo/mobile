import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CampusProfileRepository } from "@/services/campus/CampusProfileRepository"
import {
  resetCampusProfileRepository,
  setCampusProfileRepositoryForTests,
  useCampusStore,
} from "@/stores/campus"
import {
  resetCourseLinksDependencies,
  setCourseLinksApiFactoryForTests,
  setExternalLinkPresenterForTests,
  useCourseLinksStore,
} from "@/stores/courseLinks"

const repository: CampusProfileRepository = {
  load: () => ({
    version: 1,
    profiles: [
      {
        id: "campus-a",
        displayName: "Campus",
        baseUrl: "https://campus.local",
        compatibilityStatus: "unknown",
        compatibilityCheckedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    selectedCampusId: "campus-a",
  }),
  save: vi.fn(),
}

const link = {
  iid: 3,
  title: "Chamilo",
  description: "",
  url: "https://chamilo.org/",
  target: "_blank",
  position: null,
  sessionId: null,
}

describe("course links store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setCampusProfileRepositoryForTests(repository)
    useCampusStore().initialize()
    setCourseLinksApiFactoryForTests(() => ({
      getList: async () => ({
        uncategorized: [link],
        categories: [],
        totalItems: 1,
      }),
    }))
  })

  afterEach(() => {
    resetCourseLinksDependencies()
    resetCampusProfileRepository()
  })

  it("opens links through the presenter", async () => {
    const open = vi.fn()
    setExternalLinkPresenterForTests({ open })
    const store = useCourseLinksStore()

    expect(store.openLink(link)).toBe(true)
    expect(open).toHaveBeenCalledWith("https://chamilo.org/")
    expect(store.openErrorCode).toBeNull()
  })

  it("exposes a controlled error when opening fails", () => {
    setExternalLinkPresenterForTests({
      open: () => {
        throw new Error("Blocked")
      },
    })
    const store = useCourseLinksStore()

    expect(store.openLink(link)).toBe(false)
    expect(store.openErrorCode).toBe("open_failed")
  })
})
