import { describe, expect, it } from "vitest"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { MobilePushInstallationApiService } from "@/services/pushNotifications/MobilePushInstallationApiService"

class RecordingHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = []

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    this.requests.push(request)

    return {
      status: request.method === "DELETE" ? 204 : 200,
      headers: {},
      data: (request.method === "DELETE"
        ? undefined
        : {
            installationId: "11111111-1111-4111-8111-111111111111",
            platform: "android",
            createdAt: "2026-07-26T10:00:00+00:00",
            lastSeenAt: "2026-07-26T10:00:00+00:00",
          }) as TData,
    }
  }
}

describe("MobilePushInstallationApiService", () => {
  it("registers the FCM token with the verified backend contract", async () => {
    const client = new RecordingHttpClient()
    const service = new MobilePushInstallationApiService(client)

    await expect(
      service.register("11111111-1111-4111-8111-111111111111", "fcm-token"),
    ).resolves.toMatchObject({
      installationId: "11111111-1111-4111-8111-111111111111",
      platform: "android",
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
          token: "fcm-token",
          platform: "android",
        },
      },
    ])
  })

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
