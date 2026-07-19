export function resolveCampusAssetUrl(
  assetUrl: string | null,
  campusBaseUrl: string | null,
): string | null {
  if (!assetUrl || !campusBaseUrl) {
    return null
  }

  try {
    const url = new URL(assetUrl, campusBaseUrl.endsWith("/") ? campusBaseUrl : `${campusBaseUrl}/`)

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}
