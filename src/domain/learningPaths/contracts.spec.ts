import { describe, expect, it } from "vitest"

import {
  buildLearningPathRuntimeRequest,
  isOpenableLearningPathItem,
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
  it("builds a read-only runtime request with course and session context", () => {
    expect(buildLearningPathRuntimeRequest(context, 7, 11)).toEqual({
      path: "/api/learning_paths/7/runtime",
      query: {
        cid: 10,
        sid: 4,
        itemId: 11,
      },
    })
  })

  it("normalizes the runtime without exposing action or CSRF fields", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      title: "<p>Introduction</p>",
      lpType: 1,
      runtimeSupported: true,
      progress: 45,
      completedItems: 1,
      totalItems: 3,
      totalTime: 90,
      currentItemId: 11,
      previousItemId: 0,
      nextItemId: 12,
      contentUrl: "/r/document/files/uuid/view?cid=10",
      csrfToken: "must-not-be-kept",
      items: [
        {
          id: 11,
          title: "Lesson",
          itemType: "document",
          parentId: 0,
          level: 0,
          displayOrder: 1,
          status: "not attempted",
          score: 0,
          available: true,
          isSection: false,
          hasChildren: false,
          hasPrerequisite: false,
        },
      ],
    })

    expect(runtime.title).toBe("Introduction")
    expect(runtime.contentUrl).toBe("/r/document/files/uuid/view?cid=10")
    expect(runtime).not.toHaveProperty("csrfToken")
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(true)
  })

  it("rejects absolute content URLs and legacy item types", () => {
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
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(false)
  })
})
