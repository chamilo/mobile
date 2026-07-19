export type CampusCompatibilityStatus = "unknown" | "compatible" | "incompatible"

export interface CampusProfile {
  id: string
  displayName: string
  baseUrl: string
  allowInsecureHttp: boolean
  compatibilityStatus: CampusCompatibilityStatus
  compatibilityCheckedAt: string | null
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
}

export interface CampusProfileInput {
  displayName: string
  baseUrl: string
  allowInsecureHttp?: boolean
}

export type CampusProfileUpdate = CampusProfileInput
