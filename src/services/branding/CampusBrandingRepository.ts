import type { CampusBranding, CampusBrandingCacheRecord } from "@/domain/branding/types"

export interface CampusBrandingRepository {
  load(campusId: string): CampusBrandingCacheRecord | null
  save(campusId: string, branding: CampusBranding): void
  clear(campusId: string): void
}

export class CampusBrandingRepositoryError extends Error {
  constructor(
    public readonly operation: "load" | "save" | "clear",
    public readonly originalError: unknown,
  ) {
    super(`Campus branding ${operation} failed.`)
    this.name = "CampusBrandingRepositoryError"
  }
}
