import { describe, expect, it } from "vitest"

import { BrowserCampusProfileRepository } from "@/services/campus/BrowserCampusProfileRepository"

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

describe("BrowserCampusProfileRepository", () => {
  it("returns an empty versioned snapshot when storage is empty", () => {
    const repository = new BrowserCampusProfileRepository(createStorage())

    expect(repository.load()).toEqual({
      version: 1,
      profiles: [],
      selectedCampusId: null,
    })
  })

  it("persists and reloads campus profiles", () => {
    const storage = createStorage()
    const repository = new BrowserCampusProfileRepository(storage)
    const snapshot = {
      version: 1 as const,
      profiles: [
        {
          id: "campus-a",
          displayName: "Campus A",
          baseUrl: "https://campus.example.org",
          allowInsecureHttp: false,
          compatibilityStatus: "unknown" as const,
          compatibilityCheckedAt: null,
          createdAt: "2026-07-16T00:00:00.000Z",
          updatedAt: "2026-07-16T00:00:00.000Z",
          lastUsedAt: null,
        },
      ],
      selectedCampusId: "campus-a",
    }

    repository.save(snapshot)

    expect(repository.load()).toEqual(snapshot)
  })

  it("rejects corrupted storage instead of overwriting it silently", () => {
    const storage = createStorage()
    storage.setItem("chamilo-mobile/campuses/v1", "not-json")
    const repository = new BrowserCampusProfileRepository(storage)

    expect(() => repository.load()).toThrowError(expect.objectContaining({ operation: "load" }))
  })
})
