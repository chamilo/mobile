import { describe, expect, it } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ExerciseList, ExerciseRuntime } from "@/domain/exercises/types"
import type { LearningPathRuntime } from "@/domain/learningPaths/types"
import type { OfflineSnapshotRecord } from "@/domain/offline/types"
import {
  OfflineCoreFlowRepository,
  preparedExerciseListKey,
  preparedLearningPathItemKey,
} from "@/services/offline/OfflineCoreFlowRepository"
import type { OfflineSnapshotRepository } from "@/services/offline/OfflineSnapshotRepository"

function cloneTestValue<T>(value: T): T {
  if (value instanceof Blob) return value
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T
  if (Array.isArray(value)) return value.map((item) => cloneTestValue(item)) as unknown as T
  if (value && typeof value === "object") {
    const clone: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      clone[key] = cloneTestValue(item)
    }
    return clone as unknown as T
  }

  return value
}

class MemorySnapshotRepository implements OfflineSnapshotRepository {
  readonly records = new Map<string, OfflineSnapshotRecord<unknown>>()

  private key(campusId: string, userId: number, snapshotKey: string): string {
    return `${campusId}/${userId}/${snapshotKey}`
  }

  async load<TData>(
    campusId: string,
    userId: number,
    snapshotKey: string,
  ): Promise<OfflineSnapshotRecord<TData> | null> {
    const record = this.records.get(this.key(campusId, userId, snapshotKey))

    return record ? cloneTestValue(record as OfflineSnapshotRecord<TData>) : null
  }

  async save<TData>(
    campusId: string,
    userId: number,
    snapshotKey: string,
    data: TData,
  ): Promise<void> {
    this.records.set(this.key(campusId, userId, snapshotKey), {
      version: 1,
      key: this.key(campusId, userId, snapshotKey),
      campusId,
      userId,
      namespace: `${campusId}/${userId}`,
      snapshotKey,
      savedAt: "2026-08-03T00:00:00.000Z",
      data: cloneTestValue(data),
    })
  }

  async delete(campusId: string, userId: number, snapshotKey: string): Promise<void> {
    this.records.delete(this.key(campusId, userId, snapshotKey))
  }

  async clearCampus(campusId: string): Promise<void> {
    for (const [key, record] of this.records) {
      if (record.campusId === campusId) this.records.delete(key)
    }
  }
}

const directContext: CourseNavigationContext = {
  courseId: 32,
  sessionId: null,
  membershipId: 72,
  sessionCourseId: null,
  source: "direct",
}

const sessionContext: CourseNavigationContext = {
  courseId: 32,
  sessionId: 14,
  membershipId: 73,
  sessionCourseId: 91,
  source: "session",
}

const exerciseList = {
  items: [],
  totalItems: 0,
} satisfies ExerciseList

const exerciseRuntime = {
  exerciseId: 29,
  title: "LP Quiz Basic",
  description: "",
  settings: {},
  questions: [],
  questionCount: 0,
  totalScore: 0,
  canManage: false,
  legacyUrls: {},
  attempt: null,
  canStartAttempt: true,
  canSubmit: false,
  usesLegacySubmit: false,
} satisfies ExerciseRuntime

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Blob could not be read."))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsText(blob)
  })
}

const learningPathRuntime = {
  lpId: 6,
  title: "Offline lesson",
  lpType: 1,
  runtimeSupported: true,
  isCStudioContent: false,
  hideArrowNavigation: false,
  hideToc: false,
  accordionToc: false,
  progress: 0,
  completedItems: 0,
  totalItems: 1,
  totalTime: 0,
  attemptMode: "",
  currentAttempt: 1,
  currentItemAttempt: 1,
  maxAttempts: 0,
  canRestart: false,
  minimumTime: 0,
  minimumTimeReached: true,
  currentItemId: 18,
  previousItemId: 0,
  nextItemId: 0,
  contentUrl: "/api/learning-path/content/18",
  audioUrl: null,
  audioTitle: "",
  audioAutoplay: false,
  actionToken: "token",
  scorm: {
    enabled: false,
    version: "",
    itemViewId: 0,
    lpViewId: 0,
    userId: 7,
    lpType: 1,
    itemType: "document",
    forceCommit: false,
    debug: false,
    values: {},
    packageEntryPath: "",
    packageParameters: "",
    packageFingerprint: "",
    packageSize: 0,
  },
  items: [
    {
      id: 18,
      title: "Offline lesson",
      itemType: "document",
      parentId: 0,
      level: 0,
      displayOrder: 1,
      status: "not attempted",
      score: 0,
      available: true,
      isSection: false,
      hasChildren: false,
      hasPrerequisite: false,
    },
  ],
} satisfies LearningPathRuntime

describe("OfflineCoreFlowRepository", () => {
  it("isolates prepared data by the complete enrollment context", async () => {
    const snapshots = new MemorySnapshotRepository()
    const repository = new OfflineCoreFlowRepository(snapshots)

    await repository.saveExerciseList("campus-a", 7, directContext, exerciseList)

    await expect(repository.loadExerciseList("campus-a", 7, directContext)).resolves.toEqual(
      exerciseList,
    )
    await expect(repository.loadExerciseList("campus-a", 7, sessionContext)).resolves.toBeNull()
    expect(preparedExerciseListKey(directContext)).not.toBe(preparedExerciseListKey(sessionContext))
  })

  it("stores learning-path content blobs with their exact item runtime", async () => {
    const snapshots = new MemorySnapshotRepository()
    const repository = new OfflineCoreFlowRepository(snapshots)
    const blob = new Blob(["<h1>Offline lesson</h1>"], { type: "text/html" })

    await repository.saveLearningPathItem(
      "campus-a",
      7,
      directContext,
      6,
      18,
      learningPathRuntime,
      blob,
    )

    const prepared = await repository.loadLearningPathItem("campus-a", 7, directContext, 6, 18)

    expect(prepared?.runtime.currentItemId).toBe(18)
    expect(prepared?.contentBlob).toBeInstanceOf(Blob)
    expect(await readBlobText(prepared!.contentBlob!)).toContain("Offline lesson")
    expect(preparedLearningPathItemKey(directContext, 6, 18)).toContain(":6:18")
    await expect(repository.getContextStats("campus-a", 7, directContext)).resolves.toMatchObject({
      records: 1,
    })
  })

  it("removes only the prepared records that belong to one course context", async () => {
    const snapshots = new MemorySnapshotRepository()
    const repository = new OfflineCoreFlowRepository(snapshots)

    await repository.saveExerciseList("campus-a", 7, directContext, exerciseList)
    await repository.saveExerciseRuntime("campus-a", 7, directContext, 29, exerciseRuntime)
    await repository.saveExerciseList("campus-a", 7, sessionContext, exerciseList)

    await repository.clearContext("campus-a", 7, directContext)

    await expect(repository.loadExerciseList("campus-a", 7, directContext)).resolves.toBeNull()
    await expect(
      repository.loadExerciseRuntime("campus-a", 7, directContext, 29),
    ).resolves.toBeNull()
    await expect(repository.loadExerciseList("campus-a", 7, sessionContext)).resolves.toEqual(
      exerciseList,
    )
  })
})
