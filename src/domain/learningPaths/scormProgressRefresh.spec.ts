import { describe, expect, it } from "vitest"

import {
  mergeScormRuntimeProgress,
  shouldRefreshScormProgress,
} from "@/domain/learningPaths/scormProgressRefresh"
import type { LearningPathRuntime } from "@/domain/learningPaths/types"

function runtime(progress = 20): LearningPathRuntime {
  return {
    lpId: 54,
    title: "SCORM lesson",
    lpType: 2,
    runtimeSupported: true,
    isCStudioContent: false,
    hideArrowNavigation: false,
    hideToc: false,
    accordionToc: false,
    progress,
    completedItems: 0,
    totalItems: 1,
    totalTime: 60,
    attemptMode: "single",
    currentAttempt: 1,
    currentItemAttempt: 1,
    maxAttempts: 0,
    canRestart: true,
    minimumTime: 0,
    minimumTimeReached: true,
    currentItemId: 7,
    previousItemId: 0,
    nextItemId: 0,
    contentUrl: null,
    audioUrl: null,
    audioTitle: "",
    audioAutoplay: false,
    actionToken: "token",
    scorm: {
      enabled: true,
      version: "2004",
      itemViewId: 91,
      lpViewId: 11,
      userId: 5,
      lpType: 2,
      itemType: "sco",
      forceCommit: true,
      debug: false,
      values: { "cmi.suspend_data": "local-state" },
      packageEntryPath: "index.html",
      packageParameters: "",
      packageFingerprint: "a".repeat(64),
      packageSize: 1000,
    },
    items: [
      {
        id: 7,
        ref: "item-7",
        title: "SCO",
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
  }
}

describe("SCORM progress refresh", () => {
  it("refreshes only for progress-relevant commits", () => {
    expect(
      shouldRefreshScormProgress({
        values: {},
        changedKeys: ["cmi.location"],
        terminated: false,
        reason: "force-commit",
      }),
    ).toBe(false)

    expect(
      shouldRefreshScormProgress({
        values: {},
        changedKeys: ["cmi.suspend_data"],
        terminated: false,
        reason: "force-commit",
      }),
    ).toBe(true)

    expect(
      shouldRefreshScormProgress({
        values: {},
        changedKeys: [],
        terminated: true,
        reason: "terminate",
      }),
    ).toBe(true)
  })

  it("merges server progress without replacing the live SCORM runtime", () => {
    const target = runtime(20)
    const scorm = target.scorm
    const item = target.items[0]
    const refreshed = runtime(60)
    refreshed.completedItems = 1
    refreshed.totalTime = 95
    refreshed.items[0]!.status = "completed"
    refreshed.items[0]!.score = 80
    refreshed.scorm.itemViewId = 999
    refreshed.scorm.values = { "cmi.suspend_data": "server-state" }

    expect(mergeScormRuntimeProgress(target, refreshed)).toBe(true)
    expect(target.progress).toBe(60)
    expect(target.completedItems).toBe(1)
    expect(target.totalTime).toBe(95)
    expect(target.items[0]).toBe(item)
    expect(target.items[0]?.status).toBe("completed")
    expect(target.items[0]?.score).toBe(80)
    expect(target.scorm).toBe(scorm)
    expect(target.scorm.itemViewId).toBe(91)
    expect(target.scorm.values["cmi.suspend_data"]).toBe("local-state")
  })
})
