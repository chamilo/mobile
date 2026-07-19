import { describe, expect, it } from "vitest"

import { normalizeCampusBranding } from "@/domain/branding/contracts"
import type { CampusProfile } from "@/domain/campus/types"

const campus: CampusProfile = {
  id: "campus-1",
  displayName: "Local Chamilo",
  baseUrl: "https://chamilo2.local",
  allowInsecureHttp: false,
  compatibilityStatus: "compatible",
  compatibilityCheckedAt: null,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastUsedAt: "2026-07-19T00:00:00.000Z",
}

describe("normalizeCampusBranding", () => {
  it("uses a valid configured image URL", () => {
    expect(
      normalizeCampusBranding(
        {
          visual_theme: "chamilo",
          settings: {
            "platform.site_name": "My Campus",
            "platform.platform_logo_url": "/uploads/platform/logo.svg",
          },
        },
        campus,
        "2026-07-19T10:00:00.000Z",
      ),
    ).toEqual({
      siteName: "My Campus",
      logoUrl: "https://chamilo2.local/uploads/platform/logo.svg",
      visualTheme: "chamilo",
      source: "configured",
      fetchedAt: "2026-07-19T10:00:00.000Z",
    })
  })

  it("falls back to the active theme logo when the configured URL is not an image", () => {
    expect(
      normalizeCampusBranding(
        {
          visual_theme: "chamilo",
          settings: {
            "platform.platform_logo_url": "https://chamilo.org",
          },
        },
        campus,
        "2026-07-19T10:00:00.000Z",
      ),
    ).toEqual({
      siteName: "Local Chamilo",
      logoUrl: "https://chamilo2.local/themes/chamilo/logo/header",
      visualTheme: "chamilo",
      source: "theme",
      fetchedAt: "2026-07-19T10:00:00.000Z",
    })
  })

  it("rejects unsafe configured URLs and invalid theme slugs", () => {
    const branding = normalizeCampusBranding(
      {
        visual_theme: "../../unsafe",
        settings: {
          "platform.platform_logo_url": "javascript:alert(1).svg",
        },
      },
      campus,
      "2026-07-19T10:00:00.000Z",
    )

    expect(branding.logoUrl).toBe("https://chamilo2.local/themes/chamilo/logo/header")
    expect(branding.visualTheme).toBe("chamilo")
    expect(branding.source).toBe("theme")
  })
})
