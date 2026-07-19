export type CampusBrandingSource = "configured" | "theme"

export interface CampusBranding {
  siteName: string
  logoUrl: string
  visualTheme: string
  source: CampusBrandingSource
  fetchedAt: string
}

export interface CampusBrandingCacheRecord {
  version: 1
  savedAt: string
  data: CampusBranding
}
