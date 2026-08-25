import { describe, expect, it, vi } from "vitest"

import {
  AssignmentApiService,
  AssignmentServiceError,
} from "@/services/assignments/AssignmentApiService"
import type { HttpClient } from "@/services/http/HttpClient"

describe("AssignmentApiService file delivery", () => {
  it("downloads a campus-relative assignment file as an authenticated blob request", async () => {
    const blob = new Blob(["assignment"], { type: "text/plain" })
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        "content-disposition": "attachment; filename*=UTF-8''Tarea%20alumno.txt",
        "content-type": "text/plain",
      },
      data: blob,
    })
    const service = new AssignmentApiService({ request } as unknown as HttpClient)

    await expect(
      service.getFile(
        "/r/student_publication/student_publications/abc/download",
        "submission-12",
      ),
    ).resolves.toEqual({
      blob,
      filename: "Tarea alumno.txt",
    })

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/r/student_publication/student_publications/abc/download",
      headers: {
        Accept: "*/*",
      },
      responseType: "blob",
      timeoutMs: 60_000,
    })
  })

  it("rejects an external assignment file URL before making a request", async () => {
    const request = vi.fn()
    const service = new AssignmentApiService({ request } as unknown as HttpClient)

    await expect(service.getFile("https://other.example/file.pdf", "submission-12")).rejects.toMatchObject({
      code: "invalid_response",
    } satisfies Partial<AssignmentServiceError>)

    expect(request).not.toHaveBeenCalled()
  })
})
