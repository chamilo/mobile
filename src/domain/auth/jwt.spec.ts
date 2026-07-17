import { describe, expect, it } from "vitest"

import { getJwtExpiration, isTokenExpired, JwtParseError, parseJwtPayload } from "@/domain/auth/jwt"

function encode(value: object): string {
  return globalThis
    .btoa(JSON.stringify(value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function createToken(payload: object): string {
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}.signature`
}

describe("JWT helpers", () => {
  it("parses claims and converts expiration to milliseconds", () => {
    const token = createToken({ username: "student", exp: 2_000 })

    expect(parseJwtPayload(token).username).toBe("student")
    expect(getJwtExpiration(token)).toBe(2_000_000)
  })

  it("accepts tokens without an expiration claim", () => {
    expect(getJwtExpiration(createToken({ username: "student" }))).toBeNull()
  })

  it("detects expired tokens", () => {
    expect(isTokenExpired(1_000, 1_001)).toBe(true)
    expect(isTokenExpired(null, 1_001)).toBe(false)
  })

  it("rejects malformed tokens", () => {
    expect(() => parseJwtPayload("invalid")).toThrow(JwtParseError)
  })
})
