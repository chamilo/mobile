import type { CampusProfile } from "@/domain/campus/types"

export interface CampusRepositorySnapshot {
  version: 1
  profiles: CampusProfile[]
  selectedCampusId: string | null
}

export interface CampusProfileRepository {
  load(): CampusRepositorySnapshot
  save(snapshot: CampusRepositorySnapshot): void
}

export class CampusRepositoryError extends Error {
  public readonly originalError: unknown

  constructor(
    public readonly operation: "load" | "save",
    originalError?: unknown,
  ) {
    super(`Unable to ${operation} campus profiles.`)
    this.name = "CampusRepositoryError"
    this.originalError = originalError
  }
}
