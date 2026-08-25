import { describe, expect, it } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { ExerciseApiService } from "@/services/exercises/ExerciseApiService"
import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"

class RecordingHttpClient implements HttpClient {
  requests: HttpRequest[] = []

  constructor(private readonly data: unknown) {}

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    this.requests.push(request)
    return { status: 200, headers: {}, data: this.data as TData }
  }
}

const context: CourseNavigationContext = {
  courseId: 14,
  sessionId: null,
  membershipId: 19,
  sessionCourseId: null,
  source: "direct",
}

describe("ExerciseApiService", () => {
  it("loads the list with the verified course context query", async () => {
    const client = new RecordingHttpClient({ items: [], totalItems: 0 })
    const service = new ExerciseApiService(client)

    await service.getList(context)

    expect(client.requests[0]).toMatchObject({
      method: "GET",
      path: "/api/exercise/list",
      query: { cid: 14, sid: 0, gid: 0 },
    })
  })

  it("preserves the learning path runtime context for a quiz launch", async () => {
    const client = new RecordingHttpClient({
      exerciseId: 3,
      title: "Quiz",
      description: "",
      settings: {},
      questions: [],
      questionCount: 0,
      totalScore: 0,
      canManage: false,
      legacyUrls: {},
      attempt: null,
      canStartAttempt: true,
      canSubmit: false,
      usesLegacySubmit: false,
    })
    const service = new ExerciseApiService(client)

    await service.getRuntime(context, 3, {
      origin: "learnpath",
      learningPathId: 7,
      learningPathItemId: 12,
      learningPathItemViewId: 33,
      learningPathTitle: "First lesson",
    })

    expect(client.requests[0]).toMatchObject({
      method: "GET",
      path: "/api/exercise/runtime/3",
      query: {
        cid: 14,
        sid: 0,
        gid: 0,
        origin: "learnpath",
        lp_init: 1,
        learnpath_id: 7,
        learnpath_item_id: 12,
        learnpath_item_view_id: 33,
      },
    })
  })

  it("saves an answer without sending a user id", async () => {
    const client = new RecordingHttpClient({
      success: true,
      answeredQuestionIds: [5],
      canFinish: true,
    })
    const service = new ExerciseApiService(client)

    await service.saveAnswer(context, 3, 9, {
      questionId: 5,
      answer: { choice: 12 },
      reviewLater: false,
      secondsSpent: 2,
      navigationAction: "next",
    })

    expect(client.requests[0].body).toEqual({
      exerciseId: 3,
      attemptId: 9,
      questionId: 5,
      answer: { choice: 12 },
      reviewLater: false,
      secondsSpent: 2,
      navigationAction: "next",
    })
    expect(client.requests[0].body).not.toHaveProperty("userId")
  })
})
