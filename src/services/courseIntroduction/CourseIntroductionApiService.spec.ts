import { describe, expect, it } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { CourseIntroductionApiService } from "@/services/courseIntroduction/CourseIntroductionApiService"
import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"

const context: CourseNavigationContext = {
  courseId: 12,
  sessionId: 8,
  membershipId: null,
  sessionCourseId: 17,
  source: "session",
}

class FixtureHttpClient implements HttpClient {
  requestSeen: HttpRequest | null = null

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    this.requestSeen = request

    return {
      status: 200,
      headers: { "content-type": "application/ld+json" },
      data: { introText: "<p>Welcome to the course.</p>" } as TData,
    }
  }
}

describe("CourseIntroductionApiService", () => {
  it("uses the current course-tool intro contract with session context", async () => {
    const client = new FixtureHttpClient()
    const service = new CourseIntroductionApiService(client)

    await expect(service.getCurrent(context)).resolves.toBe("<p>Welcome to the course.</p>")
    expect(client.requestSeen).toMatchObject({
      method: "GET",
      path: "/api/c_tool_intros/current",
      query: { cid: 12, sid: 8 },
    })
  })
})
