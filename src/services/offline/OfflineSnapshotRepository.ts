import type { OfflineSnapshotRecord } from "@/domain/offline/types"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"
import type { OfflineDatabase } from "@/services/offline/OfflineDatabase"

export interface OfflineSnapshotRepository {
  load<TData>(
    campusId: string,
    userId: number,
    snapshotKey: string,
  ): Promise<OfflineSnapshotRecord<TData> | null>
  save<TData>(campusId: string, userId: number, snapshotKey: string, data: TData): Promise<void>
  delete(campusId: string, userId: number, snapshotKey: string): Promise<void>
  clearCampus(campusId: string): Promise<void>
}

export function buildOfflineNamespace(campusId: string, userId: number): string {
  if (!campusId.trim()) throw new Error("Campus ID is required.")
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("User ID must be positive.")

  return `${campusId}/${userId}`
}

function recordKey(campusId: string, userId: number, snapshotKey: string): string {
  return `${buildOfflineNamespace(campusId, userId)}/snapshot/${snapshotKey}`
}

export class IndexedDbOfflineSnapshotRepository implements OfflineSnapshotRepository {
  constructor(private readonly database: OfflineDatabase = indexedDbOfflineDatabase) {}

  async load<TData>(
    campusId: string,
    userId: number,
    snapshotKey: string,
  ): Promise<OfflineSnapshotRecord<TData> | null> {
    const key = recordKey(campusId, userId, snapshotKey)
    const record = await this.database.get<OfflineSnapshotRecord<TData>>("snapshots", key)

    if (!record) return null
    if (
      record.version !== 1 ||
      record.key !== key ||
      record.campusId !== campusId ||
      record.userId !== userId ||
      record.snapshotKey !== snapshotKey
    ) {
      await this.database.delete("snapshots", key)
      return null
    }

    return structuredClone(record)
  }

  async save<TData>(
    campusId: string,
    userId: number,
    snapshotKey: string,
    data: TData,
  ): Promise<void> {
    const namespace = buildOfflineNamespace(campusId, userId)
    const record: OfflineSnapshotRecord<TData> = {
      version: 1,
      key: recordKey(campusId, userId, snapshotKey),
      campusId,
      userId,
      namespace,
      snapshotKey,
      savedAt: new Date().toISOString(),
      data: structuredClone(data),
    }

    await this.database.put("snapshots", record)
  }

  async delete(campusId: string, userId: number, snapshotKey: string): Promise<void> {
    await this.database.delete("snapshots", recordKey(campusId, userId, snapshotKey))
  }

  async clearCampus(campusId: string): Promise<void> {
    await this.database.clearStoreCampus("snapshots", campusId)
  }
}

export const offlineSnapshotRepository = new IndexedDbOfflineSnapshotRepository()
