import { describe, expect, it } from "vitest"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { LocaleConfigurationApiService } from "@/services/i18n/LocaleConfigurationApiService"

class RecordingHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = []

  constructor(private readonly responses: unknown[]) {}

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request)
    return { data: this.responses.shift() as T, status: 200, headers: {} }
  }
}

describe("LocaleConfigurationApiService", () => {
  it("uses the existing Chamilo platform, language and course-settings contracts", async () => {
    const http = new RecordingHttpClient([
      {
        settings: {
          "language.platform_language": "fr_FR",
          "language.language_priority_1": "course_lang",
        },
      },
      {
        "hydra:member": [{ isocode: "fr_FR", available: true, subLanguages: [] }],
      },
      { settings: { show_course_in_user_language: "1" } },
    ])
    const service = new LocaleConfigurationApiService(http)

    await service.getPlatformConfiguration()
    await service.getAvailableLanguages()
    await service.getCourseConfiguration(42)

    expect(http.requests).toEqual([
      {
        method: "GET",
        path: "/platform-config/list",
        headers: { Accept: "application/json" },
      },
      {
        method: "GET",
        path: "/api/languages",
        headers: { Accept: "application/ld+json" },
      },
      {
        method: "GET",
        path: "/platform-config/list/course_settings",
        query: { cid: 42 },
        headers: { Accept: "application/json" },
      },
    ])
  })
})
