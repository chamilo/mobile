import { CapacitorHttp } from "@capacitor/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NativeHttpClient } from "@/services/http/NativeHttpClient"

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>()

  return {
    ...actual,
    CapacitorHttp: {
      request: vi.fn(),
    },
  }
})

const requestMock = vi.mocked(CapacitorHttp.request)

describe("NativeHttpClient", () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it("uses CapacitorHttp with a campus-relative URL and normalized response", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: { "Content-Type": "application/json" },
      url: "https://campus.example.org/api/me?active=true",
    })

    const client = new NativeHttpClient("https://campus.example.org")
    const response = await client.request<{ ok: boolean }>({
      method: "GET",
      path: "/api/me",
      query: { active: true },
      timeoutMs: 2500,
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://campus.example.org/api/me?active=true",
        connectTimeout: 2500,
        readTimeout: 2500,
        disableRedirects: true,
      }),
    )
    expect(response).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      data: { ok: true },
    })
  })

  it("rejects absolute request paths", async () => {
    const client = new NativeHttpClient("https://campus.example.org")

    await expect(
      client.request({ method: "GET", path: "https://attacker.example/api" }),
    ).rejects.toMatchObject({ kind: "configuration" })
  })

  it("normalizes HTTP errors", async () => {
    requestMock.mockResolvedValue({
      status: 403,
      data: {},
      headers: {},
      url: "https://campus.example.org/api/me",
    })

    const client = new NativeHttpClient("https://campus.example.org")

    await expect(client.request({ method: "GET", path: "/api/me" })).rejects.toMatchObject({
      kind: "http",
      status: 403,
    })
  })

  it("rejects redirects to another origin", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      url: "https://login.example.net/api/me",
    })

    const client = new NativeHttpClient("https://campus.example.org")

    await expect(client.request({ method: "GET", path: "/api/me" })).rejects.toMatchObject({
      kind: "redirect",
    })
  })
})
