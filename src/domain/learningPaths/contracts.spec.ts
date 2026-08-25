import { describe, expect, it } from "vitest"

import {
  buildLearningPathRuntimeActionRequest,
  buildLearningPathRuntimeRequest,
  buildLearningPathScormCommitRequest,
  buildLearningPathScormPackageRequest,
  isCompletedLearningPathStatus,
  isOpenableLearningPathItem,
  isQuizLearningPathItem,
  isScormLearningPathItem,
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
      query: { cid: 10, sid: 4, itemId: 11 },
    })
    expect(buildLearningPathRuntimeActionRequest(context, 7, "sync")).toEqual({
      path: "/api/learning_paths/7/runtime/sync",
      query: { cid: 10, sid: 4 },
    })
    expect(buildLearningPathScormPackageRequest(context, 7, 11)).toEqual({
      path: "/api/learning_paths/7/runtime/scorm/package",
      query: { cid: 10, sid: 4, itemId: 11 },
    })
    expect(buildLearningPathScormCommitRequest(context, 7)).toEqual({
      path: "/api/learning_paths/7/runtime/scorm/commit",
      query: { cid: 10, sid: 4 },
    })
  })

  it("normalizes runtime tracking and SCORM package data", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      title: "<strong>Introduction</strong>",
      lpType: 2,
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
      contentUrl: "/learning-path/scorm/10/4/0/7/11/index.html",
      audioUrl: "",
      audioTitle: "",
      audioAutoplay: false,
      csrfToken: "runtime-action-token",
      scorm: {
        enabled: true,
        version: "2004",
        itemViewId: 21,
        lpViewId: 8,
        userId: 4,
        lpType: 2,
        itemType: "sco",
        forceCommit: true,
        debug: false,
        values: { "cmi.location": "page-2" },
        packageEntryPath: "course/index.html",
        packageParameters: "lang=en&mode=review",
        packageFingerprint: "a".repeat(64),
        packageSize: 2048,
      },
      items: [
        {
          id: 11,
          title: "SCORM lesson",
          itemType: "sco",
          parentId: 0,
          level: 0,
          displayOrder: 1,
          status: "incomplete",
          score: 0,
          available: true,
          isSection: false,
          hasChildren: false,
          hasPrerequisite: false,
        },
      ],
    })

    expect(runtime.title).toBe("Introduction")
    expect(runtime.scorm.version).toBe("2004")
    expect(runtime.scorm.packageEntryPath).toBe("course/index.html")
    expect(runtime.scorm.packageParameters).toBe("lang=en&mode=review")
    expect(isScormLearningPathItem(runtime.items[0])).toBe(true)
    expect(isSupportedLearningPathItem(runtime.items[0])).toBe(true)
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(true)
    expect(isCompletedLearningPathStatus("completed")).toBe(true)
  })

  it("rejects unsafe package paths and unsupported item types", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      runtimeSupported: true,
      currentItemId: 12,
      contentUrl: "https://other.example/file",
      scorm: {
        enabled: true,
        version: "1.2",
        packageEntryPath: "../index.html",
        packageFingerprint: "not-a-fingerprint",
      },
      items: [{ id: 12, title: "Forum", itemType: "forum", available: true, isSection: false }],
    })

    expect(runtime.contentUrl).toBeNull()
    expect(runtime.scorm.packageEntryPath).toBe("")
    expect(runtime.scorm.packageFingerprint).toBe("")
    expect(isSupportedLearningPathItem(runtime.items[0])).toBe(false)
  })

  it("treats an available quiz as a native mobile learning path item", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      runtimeSupported: true,
      currentItemId: 12,
      contentUrl:
        "/resources/exercise/40/15/player?origin=learnpath&learnpath_id=7&learnpath_item_id=12",
      items: [{ id: 12, title: "Quiz", itemType: "quiz", available: true, isSection: false }],
    })

    expect(isQuizLearningPathItem(runtime.items[0])).toBe(true)
    expect(isSupportedLearningPathItem(runtime.items[0])).toBe(true)
    expect(isOpenableLearningPathItem(runtime.items[0] ?? null, runtime)).toBe(true)
  })
})
