import { describe, expect, it } from "vitest"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { OfflineOperation } from "@/domain/offline/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import {
  buildLearningPathSyncOperationId,
  createOfflineHttpOperation,
  createOfflineOperation,
  type OfflineOutboxRepository,
} from "@/services/offline/OfflineOutboxRepository"
import { SyncEngine } from "@/services/offline/SyncEngine"

const campus: CampusProfile = {
  id: "campus-a",
  displayName: "Campus A",
  baseUrl: "https://campus.example.org",
  allowInsecureHttp: false,
  compatibilityStatus: "unknown",
  compatibilityCheckedAt: null,
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  lastUsedAt: "2026-08-02T00:00:00.000Z",
}

const context: CourseNavigationContext = {
  courseId: 16,
  sessionId: null,
  membershipId: null,
  sessionCourseId: null,
  source: "direct",
}

class MemoryOutboxRepository implements OfflineOutboxRepository {
  operations = new Map<string, OfflineOperation>()

  async list(campusId: string, userId: number): Promise<OfflineOperation[]> {
    return [...this.operations.values()]
      .filter((operation) => operation.campusId === campusId && operation.userId === userId)
      .map((operation) => structuredClone(operation))
  }

  async put(operation: OfflineOperation): Promise<void> {
    this.operations.set(operation.id, structuredClone(operation))
  }

  async remove(operationId: string): Promise<void> {
    this.operations.delete(operationId)
  }

  async clearCampus(campusId: string): Promise<void> {
    for (const [id, operation] of this.operations) {
      if (operation.campusId === campusId) this.operations.delete(id)
    }
  }
}

function regularOperation(): OfflineOperation {
  return createOfflineOperation({
    id: buildLearningPathSyncOperationId("campus-a", 7, 16, null, 32, 197),
    campusId: "campus-a",
    userId: 7,
    type: "learning_path_regular_sync",
    payload: {
      context,
      learningPathId: 32,
      itemId: 197,
      actionToken: "csrf-token",
    },
  })
}

function successfulClient(): HttpClient {
  return {
    request: async () => ({ status: 204, headers: {}, data: undefined }),
  } as unknown as HttpClient
}

describe("SyncEngine", () => {
  it("removes a regular learning-path sync after a successful server commit", async () => {
    const repository = new MemoryOutboxRepository()
    await repository.put(regularOperation())
    const engine = new SyncEngine(repository, successfulClient)

    const result = await engine.run(campus, 7, "manual")

    expect(result.summary.attempted).toBe(1)
    expect(result.summary.synced).toBe(1)
    expect(result.operations).toEqual([])
  })

  it("replays a queued HTTP write through the authenticated transport", async () => {
    const repository = new MemoryOutboxRepository()
    await repository.put(
      createOfflineHttpOperation({
        id: "write-1",
        campusId: "campus-a",
        userId: 7,
        payload: {
          category: "message_delete",
          description: "Delete message 5",
          request: {
            method: "DELETE",
            path: "/api/mobile_messages/5",
          },
        },
      }),
    )
    const requests: string[] = []
    const engine = new SyncEngine(
      repository,
      () =>
        ({
          request: async (request: { path: string }) => {
            requests.push(request.path)
            return { status: 204, headers: {}, data: undefined }
          },
        }) as unknown as HttpClient,
    )

    const result = await engine.run(campus, 7, "manual")

    expect(requests).toEqual(["/api/mobile_messages/5"])
    expect(result.summary.synced).toBe(1)
  })

  it("keeps an unknown-delivery operation when connectivity fails", async () => {
    const repository = new MemoryOutboxRepository()
    await repository.put(regularOperation())
    const engine = new SyncEngine(
      repository,
      () =>
        ({
          request: async () => {
            throw new HttpClientError("network", "Connection lost")
          },
        }) as unknown as HttpClient,
    )

    const result = await engine.run(campus, 7, "connectivity")

    expect(result.summary.unknownDelivery).toBe(1)
    expect(result.operations[0]?.state).toBe("unknown_delivery")
  })

  it("refreshes the survey security token before replaying offline answers", async () => {
    const repository = new MemoryOutboxRepository()
    await repository.put(
      createOfflineHttpOperation({
        id: "survey-1",
        campusId: "campus-a",
        userId: 7,
        payload: {
          category: "survey_answer_submit",
          description: "Course feedback",
          clientState: {
            kind: "survey_answer_submit",
            context,
            surveyId: 8,
            invitationLpItemId: 0,
            invitationCode: "invite-8",
          },
          request: {
            method: "POST",
            path: "/api/survey/answer/8",
            query: { cid: 16, invitationCode: "invite-8" },
            headers: { "Content-Type": "application/json" },
            body: {
              csrfToken: "stale-token",
              answers: { "20": 30 },
              otherAnswers: {},
              profileValues: {},
            },
          },
        },
      }),
    )
    const requests: Array<{ method: string; body?: unknown }> = []
    const engine = new SyncEngine(
      repository,
      () =>
        ({
          request: async (request: { method: string; body?: unknown }) => {
            requests.push(structuredClone(request))

            if (request.method === "GET") {
              return {
                status: 200,
                headers: {},
                data: {
                  surveyId: 8,
                  invitationCode: "invite-8",
                  csrfToken: "fresh-token",
                  preview: false,
                  canSubmit: true,
                  isAnswered: false,
                  isFinished: false,
                  survey: { iid: 8, title: "Course feedback", surveyType: 0 },
                  questions: [],
                  pages: [],
                  answers: {},
                  profileFields: [],
                  settings: {},
                },
              }
            }

            return { status: 200, headers: {}, data: {} }
          },
        }) as unknown as HttpClient,
    )

    const result = await engine.run(campus, 7, "manual")

    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({
      method: "POST",
      body: { csrfToken: "fresh-token", answers: { "20": 30 } },
    })
    expect(result.summary.synced).toBe(1)
  })

  it("keeps an offline survey submission as a conflict when it was answered elsewhere", async () => {
    const repository = new MemoryOutboxRepository()
    await repository.put(
      createOfflineHttpOperation({
        id: "survey-conflict",
        campusId: "campus-a",
        userId: 7,
        payload: {
          category: "survey_answer_submit",
          description: "Course feedback",
          clientState: {
            kind: "survey_answer_submit",
            context,
            surveyId: 8,
            invitationLpItemId: 0,
            invitationCode: "invite-8",
          },
          request: {
            method: "POST",
            path: "/api/survey/answer/8",
            query: { cid: 16, invitationCode: "invite-8" },
            headers: { "Content-Type": "application/json" },
            body: {
              csrfToken: "stale-token",
              answers: { "20": 30 },
              otherAnswers: {},
              profileValues: {},
            },
          },
        },
      }),
    )
    const engine = new SyncEngine(
      repository,
      () =>
        ({
          request: async () => ({
            status: 200,
            headers: {},
            data: {
              surveyId: 8,
              invitationCode: "invite-8",
              csrfToken: "fresh-token",
              preview: false,
              canSubmit: false,
              isAnswered: true,
              isFinished: false,
              survey: { iid: 8, title: "Course feedback", surveyType: 0 },
              questions: [],
              pages: [],
              answers: {},
              profileFields: [],
              settings: {},
            },
          }),
        }) as unknown as HttpClient,
    )

    const result = await engine.run(campus, 7, "manual")

    expect(result.summary.conflicts).toBe(1)
    expect(result.operations[0]).toMatchObject({
      id: "survey-conflict",
      state: "conflict",
      errorCode: "conflict",
    })
  })
})
