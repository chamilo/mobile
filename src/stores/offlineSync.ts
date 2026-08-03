import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpMethod, HttpRequest } from "@/services/http/HttpClient"
import type {
  OfflineOperation,
  OfflineOperationState,
  OfflineSyncSummary,
  OfflineSyncTrigger,
  OfflineWriteCategory,
} from "@/domain/offline/types"
import {
  buildLearningPathSyncOperationId,
  buildOfflineHttpOperationId,
  createOfflineHttpOperation,
  createOfflineOperation,
  offlineOutboxRepository,
  type OfflineOutboxRepository,
} from "@/services/offline/OfflineOutboxRepository"
import { OfflineStorageError } from "@/services/offline/OfflineDatabase"
import { SyncEngine } from "@/services/offline/SyncEngine"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

export type OfflineSyncStatus = "idle" | "loading" | "syncing" | "error"
export type OfflineSyncErrorCode =
  | "storage_failed"
  | "campus_required"
  | "session_required"
  | "offline"
  | "sync_failed"

export type OfflineSyncRepository = OfflineOutboxRepository
export type OfflineSyncEngineFactory = (repository: OfflineOutboxRepository) => SyncEngine

let repository: OfflineSyncRepository = offlineOutboxRepository
let engineFactory: OfflineSyncEngineFactory = (activeRepository) => new SyncEngine(activeRepository)

export function setOfflineSyncDependenciesForTests(
  testRepository: OfflineSyncRepository,
  testEngineFactory?: OfflineSyncEngineFactory,
): void {
  repository = testRepository
  engineFactory = testEngineFactory ?? ((activeRepository) => new SyncEngine(activeRepository))
}

export function resetOfflineSyncDependencies(): void {
  repository = offlineOutboxRepository
  engineFactory = (activeRepository) => new SyncEngine(activeRepository)
}

function mapStorageError(error: unknown): OfflineSyncErrorCode {
  return error instanceof OfflineStorageError ? "storage_failed" : "sync_failed"
}

function isActionableState(state: OfflineOperationState): boolean {
  return state !== "syncing"
}

export const useOfflineSyncStore = defineStore("offlineSync", () => {
  const status = ref<OfflineSyncStatus>("idle")
  const campusId = ref<string | null>(null)
  const userId = ref<number | null>(null)
  const operations = ref<OfflineOperation[]>([])
  const lastSummary = ref<OfflineSyncSummary | null>(null)
  const lastSyncedAt = ref<string | null>(null)
  const errorCode = ref<OfflineSyncErrorCode | null>(null)

  let pendingSync: Promise<boolean> | null = null

  const pendingCount = computed(
    () =>
      operations.value.filter(
        (operation) => operation.state === "pending" || operation.state === "retryable",
      ).length,
  )
  const issueCount = computed(
    () =>
      operations.value.filter((operation) =>
        ["unknown_delivery", "requires_login", "conflict", "failed_permanent"].includes(
          operation.state,
        ),
      ).length,
  )
  const totalCount = computed(() => operations.value.length)
  const hasSession = computed(() => campusId.value !== null && userId.value !== null)
  const isSyncing = computed(() => status.value === "syncing")

  function selectedCampus(): CampusProfile | null {
    if (!campusId.value) return null

    return useCampusStore().profiles.find((campus) => campus.id === campusId.value) ?? null
  }

  async function refresh(): Promise<boolean> {
    if (!campusId.value || !userId.value) {
      operations.value = []
      return false
    }

    status.value = status.value === "syncing" ? "syncing" : "loading"
    errorCode.value = null

    try {
      operations.value = await repository.list(campusId.value, userId.value)
      if (status.value !== "syncing") status.value = "idle"
      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      return false
    }
  }

  async function activateSession(campus: CampusProfile, nextUserId: number): Promise<void> {
    const changed = campusId.value !== campus.id || userId.value !== nextUserId
    campusId.value = campus.id
    userId.value = nextUserId
    errorCode.value = null

    if (changed) {
      lastSummary.value = null
      lastSyncedAt.value = null
    }

    await refresh()
  }

  function deactivateSession(activeCampusId?: string): void {
    if (activeCampusId && campusId.value !== activeCampusId) return

    status.value = "idle"
    campusId.value = null
    userId.value = null
    operations.value = []
    lastSummary.value = null
    lastSyncedAt.value = null
    errorCode.value = null
    pendingSync = null
  }

  async function enqueueLearningPathSync(input: {
    context: CourseNavigationContext
    learningPathId: number
    itemId: number
    actionToken: string
    uncertainDelivery?: boolean
  }): Promise<boolean> {
    if (!campusId.value || !userId.value) {
      errorCode.value = "session_required"
      return false
    }

    const id = buildLearningPathSyncOperationId(
      campusId.value,
      userId.value,
      input.context.courseId,
      input.context.sessionId,
      input.learningPathId,
      input.itemId,
    )
    const existing = operations.value.find((operation) => operation.id === id)
    const operation = createOfflineOperation({
      id,
      campusId: campusId.value,
      userId: userId.value,
      type: "learning_path_regular_sync",
      state: input.uncertainDelivery ? "unknown_delivery" : "pending",
      payload: {
        context: input.context,
        learningPathId: input.learningPathId,
        itemId: input.itemId,
        actionToken: input.actionToken,
      },
    })

    if (existing) {
      operation.createdAt = existing.createdAt
      operation.attemptCount = existing.attemptCount
      operation.lastAttemptAt = existing.lastAttemptAt

      if (!["pending", "retryable"].includes(existing.state)) {
        operation.state = existing.state
        operation.errorCode = existing.errorCode
      }
    }

    try {
      await repository.put(operation)
      await refresh()
      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      return false
    }
  }

  async function enqueueHttpWrite(input: {
    category: OfflineWriteCategory
    request: HttpRequest
    description: string
    clientState?: unknown
    dedupeKey?: string | null
    uncertainDelivery?: boolean
  }): Promise<boolean> {
    if (!campusId.value || !userId.value) {
      errorCode.value = "session_required"
      return false
    }

    if (input.request.method === "GET") {
      errorCode.value = "sync_failed"
      return false
    }

    const id = buildOfflineHttpOperationId({
      campusId: campusId.value,
      userId: userId.value,
      category: input.category,
      dedupeKey: input.dedupeKey,
    })
    const existing = operations.value.find((operation) => operation.id === id)
    const operation = createOfflineHttpOperation({
      id,
      campusId: campusId.value,
      userId: userId.value,
      state: input.uncertainDelivery ? "unknown_delivery" : "pending",
      payload: {
        category: input.category,
        description: input.description,
        clientState: structuredClone(input.clientState),
        request: {
          method: input.request.method as Exclude<HttpMethod, "GET">,
          path: input.request.path,
          headers: input.request.headers,
          query: input.request.query,
          body: structuredClone(input.request.body),
          timeoutMs: input.request.timeoutMs,
          responseType: input.request.responseType,
        },
      },
    })

    if (existing) {
      operation.createdAt = existing.createdAt
      operation.attemptCount = existing.attemptCount
      operation.lastAttemptAt = existing.lastAttemptAt

      if (!["pending", "retryable"].includes(existing.state)) {
        operation.state = existing.state
        operation.errorCode = existing.errorCode
      }
    }

    try {
      await repository.put(operation)
      await refresh()
      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      return false
    }
  }

  async function performSync(trigger: OfflineSyncTrigger): Promise<boolean> {
    const campus = selectedCampus()
    const activeUserId = userId.value

    if (!campus) {
      errorCode.value = "campus_required"
      return false
    }
    if (!activeUserId) {
      errorCode.value = "session_required"
      return false
    }
    if (!useConnectivityStore().deviceOnline) {
      errorCode.value = "offline"
      return false
    }

    status.value = "syncing"
    errorCode.value = null

    try {
      const result = await engineFactory(repository).run(campus, activeUserId, trigger)
      operations.value = result.operations
      lastSummary.value = result.summary
      lastSyncedAt.value = result.summary.finishedAt
      status.value = "idle"
      return result.summary.attempted === 0 || result.summary.synced > 0
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      await refresh().catch(() => undefined)
      return false
    }
  }

  function syncNow(trigger: OfflineSyncTrigger = "manual"): Promise<boolean> {
    if (pendingSync) return pendingSync

    pendingSync = performSync(trigger).finally(() => {
      pendingSync = null
    })

    return pendingSync
  }

  async function retryOperation(operationId: string): Promise<boolean> {
    const operation = operations.value.find(({ id }) => id === operationId)
    if (!operation || !isActionableState(operation.state)) return false

    try {
      await repository.put({
        ...operation,
        state: "pending",
        updatedAt: new Date().toISOString(),
        errorCode: null,
      })
      await refresh()

      if (useConnectivityStore().deviceOnline) {
        return syncNow("manual")
      }

      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      return false
    }
  }

  async function discardOperation(operationId: string): Promise<boolean> {
    try {
      await repository.remove(operationId)
      await refresh()
      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapStorageError(error)
      return false
    }
  }

  function clearError(): void {
    errorCode.value = null
    if (status.value === "error") status.value = "idle"
  }

  return {
    status,
    campusId,
    userId,
    operations,
    lastSummary,
    lastSyncedAt,
    errorCode,
    pendingCount,
    issueCount,
    totalCount,
    hasSession,
    isSyncing,
    activateSession,
    deactivateSession,
    refresh,
    enqueueLearningPathSync,
    enqueueHttpWrite,
    syncNow,
    retryOperation,
    discardOperation,
    clearError,
  }
})
