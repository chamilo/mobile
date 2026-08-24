import { CapacitorHttp } from "@capacitor/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { HttpMultipartBody } from "@/services/http/HttpClient"
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
        headers: undefined,
        connectTimeout: 2500,
        readTimeout: 2500,
        disableRedirects: true,
        responseType: "json",
      }),
    )
    expect(response).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      data: { ok: true },
    })
  })

  it("adds the selected campus Origin to state-changing native requests", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: { "Content-Type": "application/json" },
      url: "https://campus.example.org/api/authentication_token",
    })

    const client = new NativeHttpClient("https://campus.example.org")
    await client.request<{ ok: boolean }, { probe: boolean }>({
      method: "POST",
      path: "/api/authentication_token",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: { probe: true },
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://campus.example.org",
        },
      }),
    )
  })

  it("serializes multipart bodies using Capacitor native formData entries", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: { "Content-Type": "application/json" },
      url: "https://campus.example.org/api/upload",
    })
    const body: HttpMultipartBody = {
      type: "multipart",
      fields: { questionId: "13", reviewLater: "false" },
      files: [
        {
          fieldName: "file",
          fileName: "answer.wav",
          contentType: "audio/wav",
          base64: "AQID",
        },
      ],
    }

    const client = new NativeHttpClient("https://campus.example.org")
    await client.request({
      method: "POST",
      path: "/api/upload",
      headers: {
        Accept: "application/ld+json",
        "Content-Type": "multipart/form-data",
      },
      body,
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "multipart/form-data",
          Origin: "https://campus.example.org",
        },
        dataType: "formData",
        data: [
          { key: "questionId", value: "13", type: "string" },
          { key: "reviewLater", value: "false", type: "string" },
          {
            key: "file",
            value: "AQID",
            type: "base64File",
            contentType: "audio/wav",
            fileName: "answer.wav",
          },
        ],
      }),
    )
  })

  it("replaces a caller-provided Origin with the selected campus Origin", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: {},
      url: "https://campus.example.org/api/example",
    })

    const client = new NativeHttpClient("https://campus.example.org")
    await client.request<{ ok: boolean }>({
      method: "DELETE",
      path: "/api/example",
      headers: {
        origin: "https://attacker.example",
      },
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          Origin: "https://campus.example.org",
        },
      }),
    )
  })

  it("decodes a native base64 blob response", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: "SGVsbG8=",
      headers: { "Content-Type": "text/plain" },
      url: "https://campus.example.org/r/document/file/view",
    })

    const client = new NativeHttpClient("https://campus.example.org")
    const response = await client.request<Blob>({
      method: "GET",
      path: "/r/document/file/view",
      responseType: "blob",
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        responseType: "blob",
      }),
    )
    expect(response.data).toBeInstanceOf(Blob)
    expect(response.data.type).toBe("text/plain")
    expect(await response.data.text()).toBe("Hello")
  })

  it("decodes a data URL array buffer response", async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: "data:application/octet-stream;base64,AQID",
      headers: {},
      url: "https://campus.example.org/file",
    })

    const client = new NativeHttpClient("https://campus.example.org")
    const response = await client.request<ArrayBuffer>({
      method: "GET",
      path: "/file",
      responseType: "arraybuffer",
    })

    expect(Array.from(new Uint8Array(response.data))).toEqual([1, 2, 3])
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
