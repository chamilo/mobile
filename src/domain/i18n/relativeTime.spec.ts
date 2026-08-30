import { describe, expect, it } from "vitest"

import { formatRelativeTime } from "@/domain/i18n/relativeTime"

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-08-29T12:00:00Z")

  it("uses the active French locale instead of a server-generated English label", () => {
    expect(formatRelativeTime("2026-01-29T12:00:00Z", "fr-FR", "7 months ago", now)).toContain(
      "mois",
    )
  })

  it("uses the fallback when the timestamp is unavailable", () => {
    expect(formatRelativeTime(null, "es-PE", "hace 2 días", now)).toBe("hace 2 días")
  })
})
