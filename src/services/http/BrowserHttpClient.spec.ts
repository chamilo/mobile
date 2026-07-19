import { AxiosError, AxiosHeaders, type AxiosInstance, type AxiosResponse } from "axios"
import { describe, expect, it, vi } from "vitest"

import { BrowserHttpClient } from "@/services/http/BrowserHttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

function createAxiosInstanceMock(response: Partial<AxiosResponse> = {}): AxiosInstance {
  return {
    request: vi.fn().mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: new AxiosHeaders({ "content-type": "application/json" }),
      request: { responseURL: "https://campus.example.org/chamilo/api/ping" },
      ...response,
    }),
  } as unknown as AxiosInstance
}

describe("BrowserHttpClient", () => {
  it("keeps requests under a campus subdirectory", async () => {
    const axiosInstance = createAxiosInstanceMock()
    const client = new BrowserHttpClient("https://campus.example.org/chamilo", axiosInstance)

    const response = await client.request<{ ok: boolean }>({
      method: "GET",
      path: "/api/ping",
    })

    expect(response.data.ok).toBe(true)
    expect(axiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://campus.example.org/chamilo/api/ping",
        timeout: 10_000,
      }),
    )
  })

  it("rejects absolute request paths", async () => {
    const client = new BrowserHttpClient("https://campus.example.org", createAxiosInstanceMock())

    await expect(
      client.request({ method: "GET", path: "https://other.example.org/api" }),
    ).rejects.toMatchObject({ kind: "configuration" })
  })

  it("rejects cross-host redirects", async () => {
    const axiosInstance = createAxiosInstanceMock({
      request: { responseURL: "https://other.example.org/api/ping" },
    })
    const client = new BrowserHttpClient("https://campus.example.org", axiosInstance)

    await expect(client.request({ method: "GET", path: "/api/ping" })).rejects.toMatchObject({
      kind: "redirect",
    })
  })

  it("normalizes HTTP failures", async () => {
    const axiosInstance = {
      request: vi.fn().mockRejectedValue(
        new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
          status: 403,
          statusText: "Forbidden",
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
          data: {},
        }),
      ),
    } as unknown as AxiosInstance
    const client = new BrowserHttpClient("https://campus.example.org", axiosInstance)

    await expect(client.request({ method: "GET", path: "/api/private" })).rejects.toEqual(
      expect.objectContaining<HttpClientError>({ kind: "http", status: 403 }),
    )
  })
})
