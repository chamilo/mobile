import { describe, expect, it, vi } from "vitest"
import { NotebookApiService } from "@/services/notebook/NotebookApiService"
import type { HttpClient } from "@/services/http/HttpClient"

const context = {
  courseId: 1,
  sessionId: null,
  membershipId: 2,
  sessionCourseId: null,
  source: "direct" as const,
}

describe("NotebookApiService", () => {
  it("uses the verified list endpoint", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({
        status: 200,
        headers: {},
        data: {
          courseId: 1,
          sessionId: null,
          canWrite: false,
          studentView: true,
          sort: "creation_date",
          direction: "ASC",
          totalItems: 0,
          items: [],
        },
      })
    await new NotebookApiService({ request } as HttpClient).getList(context)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/api/notebook/list",
        query: expect.objectContaining({ cid: 1 }),
      }),
    )
  })
})
