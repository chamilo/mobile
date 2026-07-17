export class JwtParseError extends Error {
  constructor(message = "The authentication token is malformed.") {
    super(message)
    this.name = "JwtParseError"
  }
}

export interface JwtPayload {
  exp?: number
  iat?: number
  sub?: string | number
  username?: string
  [claim: string]: unknown
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  try {
    return globalThis.atob(padded)
  } catch (error) {
    throw new JwtParseError(error instanceof Error ? error.message : undefined)
  }
}

export function parseJwtPayload(token: string): JwtPayload {
  const segments = token.split(".")

  if (segments.length !== 3 || !segments[1]) {
    throw new JwtParseError()
  }

  try {
    const payload: unknown = JSON.parse(decodeBase64Url(segments[1]))

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new JwtParseError()
    }

    return payload as JwtPayload
  } catch (error) {
    if (error instanceof JwtParseError) {
      throw error
    }

    throw new JwtParseError(error instanceof Error ? error.message : undefined)
  }
}

export function getJwtExpiration(token: string): number | null {
  const { exp } = parseJwtPayload(token)

  if (exp === undefined) {
    return null
  }

  if (!Number.isFinite(exp) || exp <= 0) {
    throw new JwtParseError("The authentication token has an invalid expiration claim.")
  }

  return exp * 1_000
}

export function isTokenExpired(expiresAt: number | null, now = Date.now()): boolean {
  return expiresAt !== null && expiresAt <= now
}
