import type { CurrentUserProfile } from "@/domain/auth/types"
import type { OfflineProfileRecord } from "@/domain/offline/types"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"
import type { OfflineDatabase } from "@/services/offline/OfflineDatabase"

export interface OfflineProfileRepository {
  load(campusId: string): Promise<OfflineProfileRecord | null>
  save(campusId: string, profile: CurrentUserProfile): Promise<void>
  clearCampus(campusId: string): Promise<void>
}

function profileKey(campusId: string): string {
  return `profile:${campusId}`
}

function isOfflineProfileRecord(value: unknown): value is OfflineProfileRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const record = value as Partial<OfflineProfileRecord>
  const profile = record.profile as Partial<CurrentUserProfile> | undefined

  return (
    record.version === 1 &&
    typeof record.key === "string" &&
    typeof record.campusId === "string" &&
    Number.isInteger(record.userId) &&
    typeof record.savedAt === "string" &&
    Boolean(profile) &&
    typeof profile?.id === "number" &&
    typeof profile.username === "string" &&
    typeof profile.fullName === "string" &&
    typeof profile.email === "string" &&
    typeof profile.locale === "string" &&
    typeof profile.timezone === "string" &&
    Array.isArray(profile.roles)
  )
}

export class IndexedDbOfflineProfileRepository implements OfflineProfileRepository {
  constructor(private readonly database: OfflineDatabase = indexedDbOfflineDatabase) {}

  async load(campusId: string): Promise<OfflineProfileRecord | null> {
    const record = await this.database.get<unknown>("profiles", profileKey(campusId))

    if (!record) return null
    if (!isOfflineProfileRecord(record) || record.campusId !== campusId) {
      await this.database.delete("profiles", profileKey(campusId))
      return null
    }

    return structuredClone(record)
  }

  async save(campusId: string, profile: CurrentUserProfile): Promise<void> {
    const record: OfflineProfileRecord = {
      version: 1,
      key: profileKey(campusId),
      campusId,
      userId: profile.id,
      savedAt: new Date().toISOString(),
      profile: structuredClone(profile),
    }

    await this.database.put("profiles", record)
  }

  async clearCampus(campusId: string): Promise<void> {
    await this.database.delete("profiles", profileKey(campusId))
  }
}

export const offlineProfileRepository = new IndexedDbOfflineProfileRepository()
