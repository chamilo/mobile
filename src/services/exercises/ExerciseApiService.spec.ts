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

  it("uploads oral or file answers through the verified multipart runtime endpoint", async () => {
    const client = new RecordingHttpClient({
      success: true,
      message: "Saved",
      files: [
        {
          id: 44,
          name: "answer.wav",
          size: 3,
          mimeType: "audio/wav",
          url: "/r/attempt-file/44",
        },
      ],
      savedAnswer: [],
      answeredQuestionIds: [13],
      reviewQuestionIds: [],
      answeredCount: 1,
      canFinish: false,
    })
    const service = new ExerciseApiService(client)
    const file = new File([new Uint8Array([1, 2, 3])], "answer.wav", { type: "audio/wav" })

    const response = await service.uploadAnswer(context, 3, 9, {
      questionId: 13,
      file,
      reviewLater: true,
      secondsSpent: 7,
      navigationAction: "next",
    })

    expect(client.requests[0]).toMatchObject({
      method: "POST",
      path: "/api/exercise/runtime/3/attempt/9/upload-answer",
      query: { cid: 14, sid: 0, gid: 0 },
      headers: { Accept: "application/ld+json" },
      body: {
        type: "multipart",
        fields: {
          questionId: "13",
          secondsSpent: "7",
          reviewLater: "true",
          navigationAction: "next",
        },
        files: [
          {
            fieldName: "file",
            fileName: "answer.wav",
            contentType: "audio/wav",
            base64: "AQID",
          },
        ],
      },
    })
    expect(response.files[0]?.id).toBe(44)
  })

  it("updates the review-later flag for a previously uploaded answer without reuploading it", async () => {
    const client = new RecordingHttpClient({
      success: true,
      answeredQuestionIds: [23],
      reviewQuestionIds: [23],
      answeredCount: 1,
      canFinish: false,
    })
    const service = new ExerciseApiService(client)

    await service.updateReviewLater(context, 3, 9, 23, true)

    expect(client.requests[0]).toMatchObject({
      method: "POST",
      path: "/api/exercise/runtime/3/attempt/9/answer",
      query: { cid: 14, sid: 0, gid: 0 },
      body: {
        exerciseId: 3,
        attemptId: 9,
        questionId: 23,
        answer: {},
        reviewLater: true,
        reviewLaterOnly: true,
        secondsSpent: 0,
        navigationAction: "",
      },
    })
  })
})
