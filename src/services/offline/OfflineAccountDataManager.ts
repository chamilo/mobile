import type { CampusProfile } from "@/domain/campus/types"
import type { OfflineAccountDataSnapshot } from "@/domain/offline/coursePackTypes"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { MessagesApiService } from "@/services/messages/MessagesApiService"
import { withOfflinePrefetchCapture } from "@/services/offline/OfflinePrefetchContext"
import { offlineSnapshotRepository } from "@/services/offline/OfflineSnapshotRepository"

const SNAPSHOT_KEY = "account-data"

export class OfflineAccountDataManager {
  async prepare(campus: CampusProfile, userId: number): Promise<OfflineAccountDataSnapshot> {
    const service = new MessagesApiService(createAuthenticatedHttpClient(campus))

    return withOfflinePrefetchCapture({ courseId: null, strict: true }, async () => {
      const [inbox, sent] = await Promise.all([service.getList("inbox"), service.getList("sent")])
      const ids = [...new Set([...inbox, ...sent].map(({ id }) => id))]

      for (const messageId of ids) {
        await service.getDetail(messageId)
      }

      const snapshot: OfflineAccountDataSnapshot = {
        version: 1,
        preparedAt: new Date().toISOString(),
        messageCount: ids.length,
      }

      await offlineSnapshotRepository.save(campus.id, userId, SNAPSHOT_KEY, snapshot)

      return snapshot
    })
  }

  async load(campusId: string, userId: number): Promise<OfflineAccountDataSnapshot | null> {
    const record = await offlineSnapshotRepository.load<OfflineAccountDataSnapshot>(
      campusId,
      userId,
      SNAPSHOT_KEY,
    )

    return record?.data ?? null
  }
}

export const offlineAccountDataManager = new OfflineAccountDataManager()
