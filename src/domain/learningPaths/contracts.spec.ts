import { describe, expect, it } from "vitest"

import {
  buildLearningPathRuntimeActionRequest,
  buildLearningPathRuntimeRequest,
  isCompletedLearningPathStatus,
  isOpenableLearningPathItem,
  isSupportedLearningPathItem,
  normalizeLearningPathRuntime,
} from "@/domain/learningPaths/contracts"

const context = {
  courseId: 10,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("learning path runtime contract", () => {
  it("builds runtime read and write requests with course and session context", () => {
    expect(buildLearningPathRuntimeRequest(context, 7, 11)).toEqual({
      path: "/api/learning_paths/7/runtime",
      query: {
        cid: 10,
        sid: 4,
        itemId: 11,
      },
    })

    expect(buildLearningPathRuntimeActionRequest(context, 7, "sync")).toEqual({
      path: "/api/learning_paths/7/runtime/sync",
      query: {
        cid: 10,
        sid: 4,
      },
    })
  })

  it("normalizes runtime tracking and action data", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      title: "<strong>Introduction</strong>",
      lpType: 1,
      runtimeSupported: true,
      hideToc: false,
      accordionToc: true,
      progress: 45,
      completedItems: 1,
      totalItems: 3,
      totalTime: 90,
      attemptMode: "single",
      currentAttempt: 1,
      currentItemAttempt: 2,
      maxAttempts: 3,
      canRestart: true,
      minimumTime: 60,
      minimumTimeReached: true,
      currentItemId: 11,
      previousItemId: 0,
      nextItemId: 12,
      contentUrl: "/r/document/files/uuid/view?cid=10",
      audioUrl: "/r/document/files/audio/view?cid=10",
      audioTitle: "Narration",
      audioAutoplay: true,
      csrfToken: "runtime-action-token",
      items: [
        {
          id: 11,
          title: "Lesson",
          itemType: "document",
          parentId: 0,
          level: 0,
          displayOrder: 1,
          status: "completed",
          score: 0,
          available: true,
          isSection: false,
          hasChildren: false,
          hasPrerequisite: false,
        },
      ],
    })

    expect(runtime.title).toBe("Introduction")
    expect(runtime.actionToken).toBe("runtime-action-token")
    expect(runtime.currentAttempt).toBe(1)
    expect(runtime.contentUrl).toBe("/r/document/files/uuid/view?cid=10")
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(true)
    expect(isCompletedLearningPathStatus(runtime.items[0]?.status ?? "")).toBe(true)
  })

  it("rejects absolute content URLs and unsupported item types", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      runtimeSupported: true,
      currentItemId: 12,
      contentUrl: "https://other.example/file",
      items: [
        {
          id: 12,
          title: "Quiz",
          itemType: "quiz",
          available: true,
          isSection: false,
        },
      ],
    })

    expect(runtime.contentUrl).toBeNull()
    expect(isSupportedLearningPathItem(runtime.items[0])).toBe(false)
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(false)
  })
})
