import { describe, expect, it, vi } from "vitest"

import { AuthenticatedHttpClient } from "@/services/auth/AuthenticatedHttpClient"
import type { HttpClient } from "@/services/http/HttpClient"

describe("AuthenticatedHttpClient", () => {
  it("adds the current bearer token without changing the request path", async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, data: { ok: true } })
    const client = new AuthenticatedHttpClient({ request } as HttpClient, async () => "jwt")

    await client.request({ method: "GET", path: "/api/me" })

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/me",
      headers: { Authorization: "Bearer jwt" },
    })
  })

  it("fails before the network request when no session exists", async () => {
    const request = vi.fn()
    const client = new AuthenticatedHttpClient({ request } as HttpClient, async () => null)

    await expect(client.request({ method: "GET", path: "/api/me" })).rejects.toMatchObject({
      kind: "authentication",
    })
    expect(request).not.toHaveBeenCalled()
  })
})
