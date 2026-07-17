import { describe, expect, it, vi } from "vitest"

import type { CourseDocument } from "@/domain/documents/types"
import {
  DocumentsApiService,
  DocumentsServiceError,
} from "@/services/documents/DocumentsApiService"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

const context = {
  courseId: 10,
  sessionId: null,
  membershipId: 32,
  sessionCourseId: null,
  source: "direct" as const,
}

const item: CourseDocument = {
  iid: 66,
  title: "Missing document",
  filetype: "file",
  contentUrl: "/r/document/files/missing/view",
  downloadUrl: "/r/document/files/missing/download",
  resourceNodeId: 500,
  parentResourceNodeId: 400,
  file: {
    mimeType: "text/html",
    originalName: "missing.html",
    size: 100,
    image: false,
    video: false,
    text: true,
  },
}

describe("DocumentsApiService delivery errors", () => {
  it.each([404, 500])(
    "maps HTTP %s from a document delivery route to not_found",
    async (status) => {
      const request = vi
        .fn()
        .mockRejectedValue(new HttpClientError("http", `HTTP ${status}`, status))
      const service = new DocumentsApiService({ request } as unknown as HttpClient)

      await expect(service.getContent(context, item)).rejects.toMatchObject({
        code: "not_found",
      } satisfies Partial<DocumentsServiceError>)
    },
  )

  it("keeps other delivery errors unchanged", async () => {
    const request = vi.fn().mockRejectedValue(new HttpClientError("network", "Campus unavailable"))
    const service = new DocumentsApiService({ request } as unknown as HttpClient)

    await expect(service.getDownload(context, item)).rejects.toMatchObject({
      code: "network",
    } satisfies Partial<DocumentsServiceError>)
  })
})
