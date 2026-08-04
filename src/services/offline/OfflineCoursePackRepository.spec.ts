import { describe, expect, it } from "vitest"

import type { OfflineCoursePackManifest } from "@/domain/offline/coursePackTypes"
import type { OfflineDatabase, OfflineStoreName } from "@/services/offline/OfflineDatabase"
import { IndexedDbOfflineCoursePackRepository } from "@/services/offline/OfflineCoursePackRepository"
import { OfflineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import { IndexedDbOfflineResponseCacheRepository } from "@/services/offline/OfflineResponseCacheRepository"
import { IndexedDbOfflineSnapshotRepository } from "@/services/offline/OfflineSnapshotRepository"

class MemoryOfflineDatabase implements OfflineDatabase {
  private readonly stores = new Map<OfflineStoreName, Map<string, unknown>>()

  private store(name: OfflineStoreName): Map<string, unknown> {
    const current = this.stores.get(name) ?? new Map<string, unknown>()
    this.stores.set(name, current)

    return current
  }

  async get<TRecord>(storeName: OfflineStoreName, key: string): Promise<TRecord | null> {
    return structuredClone(this.store(storeName).get(key) as TRecord | undefined) ?? null
  }

  async getAll<TRecord>(storeName: OfflineStoreName): Promise<TRecord[]> {
    return [...this.store(storeName).values()].map((value) => structuredClone(value as TRecord))
  }

  async put<TRecord>(storeName: OfflineStoreName, record: TRecord): Promise<void> {
    const key = (record as { key?: string; id?: string }).key ?? (record as { id?: string }).id
    if (!key) throw new Error("A key is required.")
    this.store(storeName).set(key, structuredClone(record))
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
    for (const storeName of ["profiles", "snapshots", "operations", "responses"] as const) {
      await this.clearStoreCampus(storeName, campusId)
    }
  }
}

function manifest(courseKey: string, title: string): OfflineCoursePackManifest {
  return {
    version: 1,
    campusId: "campus-a",
    userId: 7,
    courseKey,
    courseTitle: title,
    context: {
      courseId: Number(courseKey.split(":")[0]),
      sessionId: null,
      membershipId: 9,
      sessionCourseId: null,
      source: "direct",
    },
    selectedTools: ["course-home"],
    completedTools: ["course-home"],
    failures: [],
    warnings: [],
    scormScopes: [],
    status: "ready",
    resourceCount: 2,
    downloadedBytes: 1024,
    savedAt: "2026-08-02T20:00:00.000Z",
    updatedAt: "2026-08-02T20:00:00.000Z",
  }
}

describe("IndexedDbOfflineCoursePackRepository", () => {
  it("stores, loads and lists only the active campus and user manifests", async () => {
    const database = new MemoryOfflineDatabase()
    const snapshots = new IndexedDbOfflineSnapshotRepository(database)
    const responses = new IndexedDbOfflineResponseCacheRepository(database)
    const coreFlows = new OfflineCoreFlowRepository(snapshots)
    const repository = new IndexedDbOfflineCoursePackRepository(
      database,
      snapshots,
      responses,
      coreFlows,
    )
    const first = manifest("16:0:9:0:direct", "Course A")
    const second = manifest("17:0:10:0:direct", "Course B")

    await repository.save(first)
    await repository.save(second)

    await expect(repository.load("campus-a", 7, first.courseKey)).resolves.toEqual(first)
    await expect(repository.list("campus-a", 7)).resolves.toHaveLength(2)
    await expect(repository.list("campus-b", 7)).resolves.toEqual([])
  })

  it("removes prepared core-flow snapshots with the course manifest", async () => {
    const database = new MemoryOfflineDatabase()
    const snapshots = new IndexedDbOfflineSnapshotRepository(database)
    const responses = new IndexedDbOfflineResponseCacheRepository(database)
    const coreFlows = new OfflineCoreFlowRepository(snapshots)
    const repository = new IndexedDbOfflineCoursePackRepository(
      database,
      snapshots,
      responses,
      coreFlows,
    )
    const current = manifest("16:0:9:0:direct", "Course A")

    await repository.save(current)
    await coreFlows.saveExerciseList("campus-a", 7, current.context, {
      items: [],
      totalItems: 0,
    })

    await repository.remove(current)

    await expect(repository.load("campus-a", 7, current.courseKey)).resolves.toBeNull()
    await expect(coreFlows.loadExerciseList("campus-a", 7, current.context)).resolves.toBeNull()
  })
})
