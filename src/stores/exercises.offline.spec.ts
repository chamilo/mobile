import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ExerciseRuntime } from "@/domain/exercises/types"
import type { OfflineOperation, OfflineSnapshotRecord } from "@/domain/offline/types"
import type { ExerciseApiService } from "@/services/exercises/ExerciseApiService"
import { OfflineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import type { OfflineOutboxRepository } from "@/services/offline/OfflineOutboxRepository"
import type { OfflineSnapshotRepository } from "@/services/offline/OfflineSnapshotRepository"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import {
  resetExercisesDependencies,
  setExercisesDependenciesForTests,
  useExercisesStore,
} from "@/stores/exercises"
import {
  resetOfflineSyncDependencies,
  setOfflineSyncDependenciesForTests,
  useOfflineSyncStore,
} from "@/stores/offlineSync"

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

    return record ? structuredClone(record as OfflineSnapshotRecord<TData>) : null
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
      savedAt: "2026-08-03T20:00:00.000Z",
      data: structuredClone(data),
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

class MemoryOutboxRepository implements OfflineOutboxRepository {
  readonly operations = new Map<string, OfflineOperation>()

  async list(campusId: string, userId: number): Promise<OfflineOperation[]> {
    return [...this.operations.values()]
      .filter((operation) => operation.campusId === campusId && operation.userId === userId)
      .map((operation) => structuredClone(operation))
  }

  async put(operation: OfflineOperation): Promise<void> {
    this.operations.set(operation.id, structuredClone(operation))
  }

  async remove(operationId: string): Promise<void> {
    this.operations.delete(operationId)
  }

  async clearCampus(campusId: string): Promise<void> {
    for (const [id, operation] of this.operations) {
      if (operation.campusId === campusId) this.operations.delete(id)
    }
  }
}

const campus: CampusProfile = {
  id: "campus-a",
  displayName: "Campus A",
  baseUrl: "https://campus.example.org",
  allowInsecureHttp: false,
  compatibilityStatus: "unknown",
  compatibilityCheckedAt: null,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  lastUsedAt: "2026-08-03T00:00:00.000Z",
}

const context: CourseNavigationContext = {
  courseId: 31,
  sessionId: null,
  membershipId: 73,
  sessionCourseId: null,
  source: "direct",
}

const preparedRuntime = {
  exerciseId: 16,
  title: "[T01] Choice and scoring variants",
  description: "",
  settings: {},
  questions: [
    {
      id: 101,
      title: "Choose one",
      description: "",
      type: 1,
      typeLabel: "Unique answer",
      position: 1,
      mandatory: true,
      duration: null,
      choices: [
        { id: 1, answer: "First", position: 1 },
        { id: 2, answer: "Second", position: 2 },
      ],
      trueFalseOptions: [],
      fillBlanks: null,
      matching: null,
      draggable: null,
      dropdown: null,
      calculated: null,
      isContent: false,
    },
  ],
  questionCount: 1,
  totalScore: 1,
  canManage: false,
  legacyUrls: {},
  attempt: {
    attemptId: 25,
    attemptNumber: 1,
    status: "incomplete",
    success: true,
    message: "",
    currentQuestionIndex: 0,
    currentQuestionId: 101,
    questionIds: [101],
    totalQuestions: 1,
    startedAt: "2026-08-03T20:00:00.000Z",
    expiredAt: null,
    remainingSeconds: null,
    canNavigatePrevious: false,
    canNavigateNext: false,
    canFinish: true,
    usesLegacyRuntime: false,
    savedAnswers: {},
    reviewQuestionIds: [],
  },
  canStartAttempt: false,
  canSubmit: true,
  usesLegacySubmit: false,
} satisfies ExerciseRuntime

function prepareAuthenticatedStores(): void {
  const campusStore = useCampusStore()
  campusStore.profiles = [campus]
  campusStore.selectedCampusId = campus.id
  campusStore.initialized = true

  const authStore = useAuthStore()
  authStore.profile = {
    id: 7,
    username: "student",
    firstname: "Mobile",
    lastname: "Student",
    fullName: "Mobile Student",
    email: "student@example.org",
    locale: "en",
    timezone: "UTC",
    roles: ["ROLE_USER"],
  }
  authStore.currentCampusId = campus.id
  authStore.status = "authenticated"
}

describe("exercises store offline prepared runtime", () => {
  let snapshots: MemorySnapshotRepository
  let coreFlows: OfflineCoreFlowRepository
  let outbox: MemoryOutboxRepository
  let getRuntime: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    setActivePinia(createPinia())
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false })
    prepareAuthenticatedStores()

    snapshots = new MemorySnapshotRepository()
    coreFlows = new OfflineCoreFlowRepository(snapshots)
    outbox = new MemoryOutboxRepository()
    getRuntime = vi.fn()

    setExercisesDependenciesForTests({
      coreFlows,
      snapshots,
      serviceFactory: () =>
        ({
          getRuntime,
        }) as unknown as ExerciseApiService,
    })
    setOfflineSyncDependenciesForTests(outbox)
    await useOfflineSyncStore().activateSession(campus, 7)
    await coreFlows.saveExerciseRuntime(campus.id, 7, context, 16, preparedRuntime)
  })

  afterEach(() => {
    resetExercisesDependencies()
    resetOfflineSyncDependencies()
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true })
  })

  it("opens questions without an API call and restores the queued answer after reload", async () => {
    const store = useExercisesStore()

    await store.loadRuntime(context, 16)

    expect(getRuntime).not.toHaveBeenCalled()
    expect(store.runtime?.attempt?.attemptId).toBe(25)
    expect(store.currentQuestion?.id).toBe(101)

    store.answers[101]!.choice = 1
    await expect(store.saveCurrentAnswer(context, 16)).resolves.toBe(true)
    expect(useOfflineSyncStore().operations).toHaveLength(1)

    store.resetRuntime()
    await store.loadRuntime(context, 16)

    expect(getRuntime).not.toHaveBeenCalled()
    expect(store.currentQuestion?.id).toBe(101)
    expect(store.answers[101]?.choice).toBe(1)
    expect(useOfflineSyncStore().operations).toHaveLength(1)
  })
})
