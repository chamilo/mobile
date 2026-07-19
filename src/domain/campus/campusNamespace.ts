export type CampusNamespaceResource = "token" | "profile" | "cache" | "settings"

export function buildCampusNamespace(
  campusId: string,
  resource: CampusNamespaceResource,
  childKey?: string,
): string {
  const normalizedCampusId = campusId.trim()

  if (!normalizedCampusId || normalizedCampusId.includes("/")) {
    throw new Error("Campus ID must be a non-empty path segment.")
  }

  if (childKey !== undefined) {
    const normalizedChildKey = childKey.trim().replace(/^\/+|\/+$/g, "")

    if (!normalizedChildKey) {
      throw new Error("Child key must be a non-empty path segment.")
    }

    return `${normalizedCampusId}/${resource}/${normalizedChildKey}`
  }

  return `${normalizedCampusId}/${resource}`
}
