import { describe, expect, it, vi } from "vitest"

import { CourseLinksApiService } from "@/services/links/CourseLinksApiService"
import type { HttpClient } from "@/services/http/HttpClient"

describe("CourseLinksApiService", () => {
  it("requests the verified direct-course contract", async () => {
    const request = vi.fn().mockResolvedValue({
      data: { linksWithoutCategory: [] },
      status: 200,
      headers: {},
    })
    const service = new CourseLinksApiService({ request } as unknown as HttpClient)

    await service.getList({
      courseId: 10,
      sessionId: null,
      membershipId: 32,
      sessionCourseId: null,
      source: "direct",
    })

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/links",
      query: { cid: 10, itemsPerPage: 5000 },
      headers: { Accept: "application/ld+json" },
    })
  })

  it("preserves session context", async () => {
    const request = vi.fn().mockResolvedValue({
      data: { linksWithoutCategory: [] },
      status: 200,
      headers: {},
    })
    const service = new CourseLinksApiService({ request } as unknown as HttpClient)

    await service.getList({
      courseId: 10,
      sessionId: 7,
      membershipId: null,
      sessionCourseId: 9,
      source: "session",
    })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { cid: 10, sid: 7, itemsPerPage: 5000 },
      }),
    )
  })
})
