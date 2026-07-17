import { describe, expect, it } from "vitest"

import {
  CampusValidationError,
  normalizeCampusProfileInput,
  normalizeCampusUrl,
} from "@/domain/campus/normalizeCampusUrl"

describe("normalizeCampusUrl", () => {
  it("adds HTTPS and removes trailing slashes", () => {
    expect(normalizeCampusUrl(" chamilo2.local/// ")).toBe("https://chamilo2.local")
  })

  it("preserves a subdirectory installation", () => {
    expect(normalizeCampusUrl("https://example.org/chamilo/")).toBe("https://example.org/chamilo")
  })

  it("rejects HTTP unless explicitly allowed for local development", () => {
    expect(() => normalizeCampusUrl("http://localhost:8080")).toThrow(CampusValidationError)
    expect(normalizeCampusUrl("http://localhost:8080", { allowInsecureHttp: true })).toBe(
      "http://localhost:8080",
    )
  })

  it("rejects HTTP for a public host", () => {
    expect(() =>
      normalizeCampusUrl("http://example.org", { allowInsecureHttp: true }),
    ).toThrowError(expect.objectContaining({ code: "http_host_not_allowed" }))
  })

  it("rejects credentials, queries and fragments", () => {
    expect(() => normalizeCampusUrl("https://user:pass@example.org")).toThrowError(
      expect.objectContaining({ code: "url_credentials_not_allowed" }),
    )
    expect(() => normalizeCampusUrl("https://example.org?token=secret")).toThrowError(
      expect.objectContaining({ code: "url_query_not_allowed" }),
    )
    expect(() => normalizeCampusUrl("https://example.org#section")).toThrowError(
      expect.objectContaining({ code: "url_hash_not_allowed" }),
    )
  })
})

describe("normalizeCampusProfileInput", () => {
  it("trims the campus name and normalizes its URL", () => {
    expect(
      normalizeCampusProfileInput({
        displayName: " Local campus ",
        baseUrl: "chamilo2.local/",
      }),
    ).toEqual({
      displayName: "Local campus",
      baseUrl: "https://chamilo2.local",
      allowInsecureHttp: false,
    })
  })

  it("does not persist an HTTP opt-in for an HTTPS campus", () => {
    expect(
      normalizeCampusProfileInput({
        displayName: "Secure campus",
        baseUrl: "https://example.org",
        allowInsecureHttp: true,
      }),
    ).toEqual({
      displayName: "Secure campus",
      baseUrl: "https://example.org",
      allowInsecureHttp: false,
    })
  })
})
