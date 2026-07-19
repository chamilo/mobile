import type { CampusProfile } from "@/domain/campus/types"
import type { CampusBranding } from "@/domain/branding/types"

export class CampusBrandingContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CampusBrandingContractError"
  }
}

type UnknownRecord = Record<string, unknown>

const DEFAULT_THEME = "chamilo"
const ALLOWED_LOGO_EXTENSIONS = new Set(["svg", "png", "jpg", "jpeg", "gif", "webp"])

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function hasAllowedLogoExtension(pathname: string): boolean {
  const cleanPath = pathname.split("?")[0]?.split("#")[0] ?? ""
  const filename = cleanPath.split("/").pop() ?? ""
  const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : ""

  return Boolean(extension && ALLOWED_LOGO_EXTENSIONS.has(extension))
}

function normalizeTheme(value: unknown): string {
  const theme = text(value)

  return /^[A-Za-z0-9_-]+$/.test(theme) ? theme : DEFAULT_THEME
}

function resolveSafeAssetUrl(assetUrl: string, campusBaseUrl: string): URL | null {
  try {
    const baseUrl = new URL(campusBaseUrl.endsWith("/") ? campusBaseUrl : `${campusBaseUrl}/`)
    const url = new URL(assetUrl, baseUrl)

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null
    }

    return url
  } catch {
    return null
  }
}

function resolveConfiguredLogoUrl(value: unknown, campusBaseUrl: string): string | null {
  const configuredUrl = text(value)
  if (!configuredUrl) return null

  const resolvedUrl = resolveSafeAssetUrl(configuredUrl, campusBaseUrl)
  if (!resolvedUrl || !hasAllowedLogoExtension(resolvedUrl.pathname)) return null

  return resolvedUrl.toString()
}

function resolveThemeLogoUrl(theme: string, campusBaseUrl: string): string {
  const themePath = `/themes/${encodeURIComponent(theme)}/logo/header`
  const resolvedUrl = resolveSafeAssetUrl(themePath, campusBaseUrl)

  if (!resolvedUrl) {
    throw new CampusBrandingContractError("The campus theme logo URL is invalid.")
  }

  return resolvedUrl.toString()
}

export function normalizeCampusBranding(
  value: unknown,
  campus: CampusProfile,
  fetchedAt = new Date().toISOString(),
): CampusBranding {
  if (!isRecord(value)) {
    throw new CampusBrandingContractError("The platform configuration response is invalid.")
  }

  const settings = isRecord(value.settings) ? value.settings : {}
  const visualTheme = normalizeTheme(value.visual_theme)
  const configuredLogoUrl = resolveConfiguredLogoUrl(
    settings["platform.platform_logo_url"],
    campus.baseUrl,
  )
  const configuredSiteName = text(settings["platform.site_name"])

  return {
    siteName: configuredSiteName || campus.displayName || "Chamilo",
    logoUrl: configuredLogoUrl ?? resolveThemeLogoUrl(visualTheme, campus.baseUrl),
    visualTheme,
    source: configuredLogoUrl ? "configured" : "theme",
    fetchedAt,
  }
}
