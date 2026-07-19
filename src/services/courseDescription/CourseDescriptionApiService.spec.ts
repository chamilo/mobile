import { describe, expect, it, vi } from "vitest"

import { CourseDescriptionApiService } from "@/services/courseDescription/CourseDescriptionApiService"
import type { HttpClient } from "@/services/http/HttpClient"

describe("CourseDescriptionApiService", () => {
  it("requests the read-only student contract with course and session context", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        items: [],
        totalItems: 0,
        courseId: 10,
        sessionId: 7,
        studentView: true,
        types: [],
        settings: { searchEnabled: true, saveTitlesAsHtml: false },
      },
      status: 200,
      headers: {},
    })
    const service = new CourseDescriptionApiService({ request } as unknown as HttpClient)

    await service.getList({
      courseId: 10,
      sessionId: 7,
      membershipId: null,
      sessionCourseId: 3,
      source: "session",
    })

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/course-description/list",
      query: { cid: 10, sid: 7, isStudentView: true },
      headers: { Accept: "application/ld+json", "Cache-Control": "no-store" },
    })
  })
})
