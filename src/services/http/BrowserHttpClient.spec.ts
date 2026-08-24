import { AxiosError, AxiosHeaders, type AxiosInstance, type AxiosResponse } from "axios"
import { describe, expect, it, vi } from "vitest"

import { BrowserHttpClient } from "@/services/http/BrowserHttpClient"
import type { HttpMultipartBody } from "@/services/http/HttpClient"
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

  it("converts transport-neutral multipart bodies to FormData and lets the browser set the boundary", async () => {
    const axiosInstance = createAxiosInstanceMock({
      request: { responseURL: "https://campus.example.org/api/upload" },
    })
    const client = new BrowserHttpClient("https://campus.example.org", axiosInstance)
    const body: HttpMultipartBody = {
      type: "multipart",
      fields: { questionId: "23", reviewLater: "false" },
      files: [
        {
          fieldName: "file",
          fileName: "answer.txt",
          contentType: "text/plain",
          base64: "SGVsbG8=",
        },
      ],
    }

    await client.request({
      method: "POST",
      path: "/api/upload",
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
      body,
    })

    const request = vi.mocked(axiosInstance.request).mock.calls[0]?.[0]
    expect(request?.headers).toEqual({ Accept: "application/json" })
    expect(request?.data).toBeInstanceOf(FormData)

    const formData = request?.data as FormData
    expect(formData.get("questionId")).toBe("23")
    const uploaded = formData.get("file")
    expect(uploaded).toBeInstanceOf(File)
    expect((uploaded as File).name).toBe("answer.txt")
    expect(await (uploaded as File).text()).toBe("Hello")
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
