import type {
  OfflineHttpWritePayload,
  OfflineOperation,
  OfflineOperationState,
  OfflineOperationType,
  OfflineWriteCategory,
} from "@/domain/offline/types"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"
import type { OfflineDatabase } from "@/services/offline/OfflineDatabase"
import { buildOfflineNamespace } from "@/services/offline/OfflineSnapshotRepository"

export interface OfflineOutboxRepository {
  list(campusId: string, userId: number): Promise<OfflineOperation[]>
  put(operation: OfflineOperation): Promise<void>
  remove(operationId: string): Promise<void>
  clearCampus(campusId: string): Promise<void>
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function buildLearningPathSyncOperationId(
  campusId: string,
  userId: number,
  courseId: number,
  sessionId: number | null,
  learningPathId: number,
  itemId: number,
): string {
  return [
    "lp-sync",
    encodeURIComponent(campusId),
    userId,
    courseId,
    sessionId ?? 0,
    learningPathId,
    itemId,
  ].join(":")
}

export function buildOfflineHttpOperationId(input: {
  campusId: string
  userId: number
  category: OfflineWriteCategory
  dedupeKey?: string | null
}): string {
  const suffix = input.dedupeKey?.trim() || randomId()

  return [
    "http-write",
    encodeURIComponent(input.campusId),
    input.userId,
    input.category,
    encodeURIComponent(suffix),
  ].join(":")
}

export function createOfflineOperation<TType extends OfflineOperationType>(input: {
  id: string
  campusId: string
  userId: number
  type: TType
  state?: OfflineOperationState
  payload: OfflineOperation<TType>["payload"]
}): OfflineOperation<TType> {
  const now = new Date().toISOString()

  return {
    id: input.id,
    campusId: input.campusId,
    userId: input.userId,
    namespace: buildOfflineNamespace(input.campusId, input.userId),
    type: input.type,
    state: input.state ?? "pending",
    payload: structuredClone(input.payload),
    createdAt: now,
    updatedAt: now,
    lastAttemptAt: null,
    attemptCount: 0,
    errorCode: null,
  }
}

export function createOfflineHttpOperation(input: {
  id: string
  campusId: string
  userId: number
  state?: OfflineOperationState
  payload: OfflineHttpWritePayload
}): OfflineOperation<"http_write"> {
  return createOfflineOperation({
    ...input,
    type: "http_write",
  })
}

export class IndexedDbOfflineOutboxRepository implements OfflineOutboxRepository {
  constructor(private readonly database: OfflineDatabase = indexedDbOfflineDatabase) {}

  async list(campusId: string, userId: number): Promise<OfflineOperation[]> {
    const namespace = buildOfflineNamespace(campusId, userId)
    const operations = await this.database.getAll<OfflineOperation>("operations")

    return operations
      .filter((operation) => operation.namespace === namespace)
      .map((operation) => structuredClone(operation))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  }

  async put(operation: OfflineOperation): Promise<void> {
    await this.database.put("operations", structuredClone(operation))
  }

  async remove(operationId: string): Promise<void> {
    await this.database.delete("operations", operationId)
  }

  async clearCampus(campusId: string): Promise<void> {
    await this.database.clearStoreCampus("operations", campusId)
  }
}

export const offlineOutboxRepository = new IndexedDbOfflineOutboxRepository()
