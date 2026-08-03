import { describe, expect, it } from "vitest"

import {
  buildLearningPathSyncOperationId,
  buildOfflineHttpOperationId,
  createOfflineHttpOperation,
  createOfflineOperation,
} from "@/services/offline/OfflineOutboxRepository"

describe("offline outbox operations", () => {
  it("creates a stable learning-path operation ID for safe coalescing", () => {
    expect(buildLearningPathSyncOperationId("campus-a", 7, 16, null, 32, 197)).toBe(
      buildLearningPathSyncOperationId("campus-a", 7, 16, null, 32, 197),
    )
  })

  it("creates a stable HTTP operation ID when a dedupe key is provided", () => {
    expect(
      buildOfflineHttpOperationId({
        campusId: "campus-a",
        userId: 7,
        category: "exercise_answer",
        dedupeKey: "attempt:4:question:9",
      }),
    ).toBe(
      buildOfflineHttpOperationId({
        campusId: "campus-a",
        userId: 7,
        category: "exercise_answer",
        dedupeKey: "attempt:4:question:9",
      }),
    )
  })

  it("creates campus and user scoped operations without storing credentials", () => {
    const regular = createOfflineOperation({
      id: "operation-1",
      campusId: "campus-a",
      userId: 7,
      type: "learning_path_regular_sync",
      payload: {
        context: {
          courseId: 16,
          sessionId: null,
          membershipId: null,
          sessionCourseId: null,
          source: "direct",
        },
        learningPathId: 32,
        itemId: 197,
        actionToken: "action-token",
      },
    })
    const write = createOfflineHttpOperation({
      id: "operation-2",
      campusId: "campus-a",
      userId: 7,
      payload: {
        category: "message_delete",
        description: "Delete message 5",
        request: { method: "DELETE", path: "/api/mobile_messages/5" },
      },
    })

    expect(regular.namespace).toBe("campus-a/7")
    expect(write.namespace).toBe("campus-a/7")
    expect(JSON.stringify(write)).not.toContain("Bearer")
  })
})
