import { describe, expect, it } from "vitest"

import { normalizeSafeExternalUrl, UnsafeExternalUrlError } from "@/domain/links/safeExternalUrl"

describe("normalizeSafeExternalUrl", () => {
  it("accepts HTTP and HTTPS URLs", () => {
    expect(normalizeSafeExternalUrl("https://chamilo.org")).toBe("https://chamilo.org/")
    expect(normalizeSafeExternalUrl("http://example.org/path")).toBe("http://example.org/path")
  })

  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.org/file",
    "https://user:password@example.org",
    "relative/path",
    "",
  ])("rejects unsafe URL %s", (value) => {
    expect(() => normalizeSafeExternalUrl(value)).toThrow(UnsafeExternalUrlError)
  })
})
