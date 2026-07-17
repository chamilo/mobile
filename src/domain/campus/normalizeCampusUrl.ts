import type { CampusProfileInput } from "@/domain/campus/types"

export type CampusValidationErrorCode =
  | "display_name_required"
  | "display_name_too_long"
  | "url_required"
  | "url_invalid"
  | "url_credentials_not_allowed"
  | "url_query_not_allowed"
  | "url_hash_not_allowed"
  | "protocol_not_allowed"
  | "http_not_allowed"
  | "http_host_not_allowed"

export class CampusValidationError extends Error {
  constructor(
    public readonly code: CampusValidationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CampusValidationError"
  }
}

export interface NormalizeCampusUrlOptions {
  allowInsecureHttp?: boolean
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number)

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }

  const [first, second] = parts

  if (first === undefined || second === undefined) {
    return false
  }

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

export function isLocalDevelopmentHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "")

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".local") ||
    isPrivateIpv4(normalizedHostname)
  )
}

export function normalizeCampusUrl(
  rawUrl: string,
  options: NormalizeCampusUrlOptions = {},
): string {
  const input = rawUrl.trim()

  if (!input) {
    throw new CampusValidationError("url_required", "Campus URL is required.")
  }

  const valueWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`

  let url: URL

  try {
    url = new URL(valueWithProtocol)
  } catch {
    throw new CampusValidationError("url_invalid", "Campus URL is invalid.")
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new CampusValidationError(
      "protocol_not_allowed",
      "Only HTTP and HTTPS URLs are supported.",
    )
  }

  if (url.username || url.password) {
    throw new CampusValidationError(
      "url_credentials_not_allowed",
      "Credentials are not allowed in a campus URL.",
    )
  }

  if (url.search) {
    throw new CampusValidationError("url_query_not_allowed", "Query parameters are not allowed.")
  }

  if (url.hash) {
    throw new CampusValidationError("url_hash_not_allowed", "Fragments are not allowed.")
  }

  if (url.protocol === "http:") {
    if (!options.allowInsecureHttp) {
      throw new CampusValidationError("http_not_allowed", "HTTPS is required for this campus.")
    }

    if (!isLocalDevelopmentHost(url.hostname)) {
      throw new CampusValidationError(
        "http_host_not_allowed",
        "HTTP is allowed only for explicit local development hosts.",
      )
    }
  }

  const pathname = url.pathname.replace(/\/+$/, "")

  return `${url.origin}${pathname === "/" ? "" : pathname}`
}

export function normalizeCampusProfileInput(
  input: CampusProfileInput,
): Required<CampusProfileInput> {
  const displayName = input.displayName.trim()

  if (!displayName) {
    throw new CampusValidationError("display_name_required", "Campus name is required.")
  }

  if (displayName.length > 80) {
    throw new CampusValidationError(
      "display_name_too_long",
      "Campus name must contain at most 80 characters.",
    )
  }

  const requestedInsecureHttp = input.allowInsecureHttp === true
  const baseUrl = normalizeCampusUrl(input.baseUrl, {
    allowInsecureHttp: requestedInsecureHttp,
  })

  return {
    displayName,
    baseUrl,
    allowInsecureHttp: requestedInsecureHttp && baseUrl.startsWith("http://"),
  }
}
