import { describe, expect, it, vi } from "vitest"

import {
  ExerciseRuntimeResourceError,
  ExerciseRuntimeResourceService,
} from "@/services/exercises/ExerciseRuntimeResourceService"
import type { HttpClient } from "@/services/http/HttpClient"

function httpClientMock() {
  return {
    request: vi.fn(),
  } as unknown as HttpClient
}

describe("ExerciseRuntimeResourceService", () => {
  it("loads a same-campus image through the authenticated HttpClient contract", async () => {
    const http = httpClientMock()
    const blob = new Blob(["image"], { type: "image/png" })
    vi.mocked(http.request).mockResolvedValue({ status: 200, headers: {}, data: blob })

    const service = new ExerciseRuntimeResourceService(http, "https://campus.example.org")
    const result = await service.loadImage(
      "https://campus.example.org/r/question/file?mode=view&filter=hotspot_question&cid=3&sid=0",
    )

    expect(result).toBe(blob)
    expect(http.request).toHaveBeenCalledWith({
      method: "GET",
      path: "/r/question/file",
      query: {
        mode: "view",
        filter: "hotspot_question",
        cid: "3",
        sid: "0",
      },
      headers: { Accept: "image/*" },
      responseType: "blob",
    })
  })

  it("rejects an image URL from another origin", async () => {
    const service = new ExerciseRuntimeResourceService(
      httpClientMock(),
      "https://campus.example.org",
    )

    await expect(service.loadImage("https://attacker.example/image.png")).rejects.toBeInstanceOf(
      ExerciseRuntimeResourceError,
    )
  })
})
