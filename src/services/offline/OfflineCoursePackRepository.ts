import type {
  OfflineCoursePackManifest,
  OfflineStorageEstimate,
} from "@/domain/offline/coursePackTypes"
import type { OfflineSnapshotRecord } from "@/domain/offline/types"
import { scormPackageHost } from "@/services/learningPaths/ScormPackageHost"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"
import { OfflineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import type { OfflineDatabase } from "@/services/offline/OfflineDatabase"
import {
  IndexedDbOfflineResponseCacheRepository,
  type OfflineResponseCacheRepository,
} from "@/services/offline/OfflineResponseCacheRepository"
import {
  buildOfflineNamespace,
  IndexedDbOfflineSnapshotRepository,
  type OfflineSnapshotRepository,
} from "@/services/offline/OfflineSnapshotRepository"

const SNAPSHOT_PREFIX = "course-pack:"

export interface OfflineCoursePackRepository {
  load(
    campusId: string,
    userId: number,
    courseKey: string,
  ): Promise<OfflineCoursePackManifest | null>
  list(campusId: string, userId: number): Promise<OfflineCoursePackManifest[]>
  save(manifest: OfflineCoursePackManifest): Promise<void>
  remove(manifest: OfflineCoursePackManifest): Promise<void>
  storageEstimate(): Promise<OfflineStorageEstimate>
}

function snapshotKey(courseKey: string): string {
  return `${SNAPSHOT_PREFIX}${courseKey}`
}

function recordKey(campusId: string, userId: number, courseKey: string): string {
  return `${buildOfflineNamespace(campusId, userId)}/snapshot/${snapshotKey(courseKey)}`
}

function isManifest(value: unknown): value is OfflineCoursePackManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const candidate = value as Partial<OfflineCoursePackManifest>

  return (
    candidate.version === 1 &&
    typeof candidate.campusId === "string" &&
    typeof candidate.userId === "number" &&
    Number.isInteger(candidate.userId) &&
    typeof candidate.courseKey === "string" &&
    typeof candidate.courseTitle === "string" &&
    Boolean(candidate.context) &&
    Array.isArray(candidate.selectedTools) &&
    Array.isArray(candidate.completedTools) &&
    Array.isArray(candidate.failures) &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.scormScopes)
  )
}

export class IndexedDbOfflineCoursePackRepository implements OfflineCoursePackRepository {
  constructor(
    private readonly database: OfflineDatabase = indexedDbOfflineDatabase,
    private readonly snapshots: OfflineSnapshotRepository = new IndexedDbOfflineSnapshotRepository(
      database,
    ),
    private readonly responses: OfflineResponseCacheRepository = new IndexedDbOfflineResponseCacheRepository(
      database,
    ),
    private readonly coreFlows: OfflineCoreFlowRepository = new OfflineCoreFlowRepository(
      snapshots,
    ),
  ) {}

  async load(
    campusId: string,
    userId: number,
    courseKey: string,
  ): Promise<OfflineCoursePackManifest | null> {
    const record = await this.snapshots.load<OfflineCoursePackManifest>(
      campusId,
      userId,
      snapshotKey(courseKey),
    )

    if (!record || !isManifest(record.data)) return null

    return structuredClone(record.data)
  }

  async list(campusId: string, userId: number): Promise<OfflineCoursePackManifest[]> {
    const records = await this.database.getAll<OfflineSnapshotRecord<unknown>>("snapshots")

    return records
      .filter(
        (record) =>
          record.campusId === campusId &&
          record.userId === userId &&
          record.snapshotKey.startsWith(SNAPSHOT_PREFIX) &&
          isManifest(record.data),
      )
      .map((record) => structuredClone(record.data as OfflineCoursePackManifest))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async save(manifest: OfflineCoursePackManifest): Promise<void> {
    await this.snapshots.save(
      manifest.campusId,
      manifest.userId,
      snapshotKey(manifest.courseKey),
      manifest,
    )
  }

  async remove(manifest: OfflineCoursePackManifest): Promise<void> {
    for (const scope of manifest.scormScopes) {
      await scormPackageHost.remove(scope).catch(() => undefined)
    }

    await Promise.all([
      this.responses.clearCourse(manifest.campusId, manifest.userId, manifest.context.courseId),
      this.coreFlows.clearContext(manifest.campusId, manifest.userId, manifest.context),
    ])
    await this.database.delete(
      "snapshots",
      recordKey(manifest.campusId, manifest.userId, manifest.courseKey),
    )
  }

  async storageEstimate(): Promise<OfflineStorageEstimate> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return { usage: null, quota: null }
    }

    const estimate = await navigator.storage.estimate()

    return {
      usage: typeof estimate.usage === "number" ? estimate.usage : null,
      quota: typeof estimate.quota === "number" ? estimate.quota : null,
    }
  }
}

export const offlineCoursePackRepository = new IndexedDbOfflineCoursePackRepository()
