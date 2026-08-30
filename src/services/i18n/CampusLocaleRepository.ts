import type { CampusLocaleCacheData, CampusLocaleCacheRecord } from "@/domain/i18n/types"

export interface CampusLocaleRepository {
  load(campusId: string): CampusLocaleCacheRecord | null
  save(campusId: string, data: CampusLocaleCacheData): void
  clear(campusId: string): void
}

export class CampusLocaleRepositoryError extends Error {
  constructor(
    public readonly operation: "load" | "save" | "clear",
    public readonly originalError: unknown,
  ) {
    super(`Campus locale settings ${operation} failed.`)
    this.name = "CampusLocaleRepositoryError"
  }
}
