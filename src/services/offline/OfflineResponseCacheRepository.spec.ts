import { describe, expect, it } from "vitest"

import type { OfflineDatabase, OfflineStoreName } from "@/services/offline/OfflineDatabase"
import { IndexedDbOfflineResponseCacheRepository } from "@/services/offline/OfflineResponseCacheRepository"

class MemoryOfflineDatabase implements OfflineDatabase {
  private readonly stores = new Map<OfflineStoreName, Map<string, unknown>>()

  private store(name: OfflineStoreName): Map<string, unknown> {
    const current = this.stores.get(name) ?? new Map<string, unknown>()
    this.stores.set(name, current)
    return current
  }

  async get<TRecord>(storeName: OfflineStoreName, key: string): Promise<TRecord | null> {
    return (this.store(storeName).get(key) as TRecord | undefined) ?? null
  }

  async getAll<TRecord>(storeName: OfflineStoreName): Promise<TRecord[]> {
    return [...this.store(storeName).values()] as TRecord[]
  }

  async put<TRecord>(storeName: OfflineStoreName, record: TRecord): Promise<void> {
    const key = (record as { key: string }).key
    this.store(storeName).set(key, record)
  }

  async delete(storeName: OfflineStoreName, key: string): Promise<void> {
    this.store(storeName).delete(key)
  }

  async clearStoreCampus(storeName: OfflineStoreName, campusId: string): Promise<void> {
    for (const [key, value] of this.store(storeName)) {
      if ((value as { campusId?: string }).campusId === campusId) {
        this.store(storeName).delete(key)
      }
    }
  }

  async clearCampus(campusId: string): Promise<void> {
    await this.clearStoreCampus("responses", campusId)
  }
}

describe("IndexedDbOfflineResponseCacheRepository", () => {
  it("tracks byte usage and clears only the selected course", async () => {
    const repository = new IndexedDbOfflineResponseCacheRepository(new MemoryOfflineDatabase())

    await repository.save(
      "campus-a",
      7,
      { method: "GET", path: "/api/documents", query: { cid: 16 } },
      { status: 200, headers: {}, data: { value: "course-a" } },
    )
    await repository.save(
      "campus-a",
      7,
      { method: "GET", path: "/api/documents", query: { cid: 17 } },
      { status: 200, headers: {}, data: { value: "course-b" } },
    )

    await expect(repository.getStats("campus-a", 7, 16)).resolves.toMatchObject({ records: 1 })
    await repository.clearCourse("campus-a", 7, 16)
    await expect(repository.getStats("campus-a", 7, 16)).resolves.toEqual({ records: 0, bytes: 0 })
    await expect(repository.getStats("campus-a", 7, 17)).resolves.toMatchObject({ records: 1 })
  })
})
