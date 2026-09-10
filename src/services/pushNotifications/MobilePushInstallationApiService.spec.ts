import { describe, expect, it } from "vitest"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import {
  MobilePushInstallationApiService,
  type MobilePushPlatform,
} from "@/services/pushNotifications/MobilePushInstallationApiService"

class RecordingHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = []

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    this.requests.push(request)
    const platform =
      request.method === "POST" && request.body && typeof request.body === "object"
        ? ((request.body as { platform?: MobilePushPlatform }).platform ?? "android")
        : "android"

    return {
      status: request.method === "DELETE" ? 204 : 200,
      headers: {},
      data: (request.method === "DELETE"
        ? undefined
        : {
            installationId: "11111111-1111-4111-8111-111111111111",
            platform,
            createdAt: "2026-07-26T10:00:00+00:00",
            lastSeenAt: "2026-07-26T10:00:00+00:00",
          }) as TData,
    }
  }
}

describe("MobilePushInstallationApiService", () => {
  it.each<MobilePushPlatform>(["android", "ios"])(
    "registers the native push token with platform %s",
    async (platform) => {
      const client = new RecordingHttpClient()
      const service = new MobilePushInstallationApiService(client)

      await expect(
        service.register("11111111-1111-4111-8111-111111111111", "native-push-token", platform),
      ).resolves.toMatchObject({
        installationId: "11111111-1111-4111-8111-111111111111",
        platform,
      })
      expect(client.requests).toEqual([
        {
          method: "POST",
          path: "/api/mobile_push_installations",
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
          body: {
            installationId: "11111111-1111-4111-8111-111111111111",
            token: "native-push-token",
            platform,
          },
        },
      ])
    },
  )

  it("removes the owned installation using its UUID", async () => {
    const client = new RecordingHttpClient()
    const service = new MobilePushInstallationApiService(client)

    await service.remove("11111111-1111-4111-8111-111111111111")

    expect(client.requests).toEqual([
      {
        method: "DELETE",
        path: "/api/mobile_push_installations/11111111-1111-4111-8111-111111111111",
        headers: {
          Accept: "application/ld+json",
        },
      },
    ])
  })
})
