import { describe, expect, it } from "vitest"

import type { CampusProfile } from "@/domain/campus/types"
import { PlatformBrandingApiService } from "@/services/branding/PlatformBrandingApiService"
import type { HttpClient } from "@/services/http/HttpClient"

const campus: CampusProfile = {
  id: "campus-1",
  displayName: "Local Chamilo",
  baseUrl: "https://chamilo2.local",
  allowInsecureHttp: false,
  compatibilityStatus: "compatible",
  compatibilityCheckedAt: null,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  lastUsedAt: null,
}

describe("PlatformBrandingApiService", () => {
  it("loads public platform branding through HttpClient", async () => {
    const requests: unknown[] = []
    const httpClient = {
      async request(request: unknown) {
        requests.push(request)

        return {
          status: 200,
          headers: {},
          data: {
            visual_theme: "chamilo",
            settings: {
              "platform.platform_logo_url": "https://chamilo.org",
            },
          },
        }
      },
    } as HttpClient

    const branding = await new PlatformBrandingApiService(httpClient, campus).getBranding()

    expect(requests).toEqual([
      {
        method: "GET",
        path: "/platform-config/list",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
      },
    ])
    expect(branding).toMatchObject({
      siteName: "Local Chamilo",
      logoUrl: "https://chamilo2.local/themes/chamilo/logo/header",
      source: "theme",
    })
  })
})
