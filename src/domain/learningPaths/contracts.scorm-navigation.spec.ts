import { describe, expect, it } from "vitest"

import { normalizeLearningPathRuntime } from "@/domain/learningPaths/contracts"

describe("learning path SCORM navigation contract", () => {
  it("preserves manifest item references returned by the runtime provider", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      runtimeSupported: true,
      currentItemId: 11,
      scorm: {
        enabled: true,
        version: "2004",
        packageEntryPath: "course/index.html",
        packageFingerprint: "a".repeat(64),
      },
      items: [
        {
          id: 11,
          ref: "ACTIVITY-INTRO",
          title: "Introduction",
          itemType: "sco",
          available: true,
          isSection: false,
        },
      ],
    })

    expect(runtime.items[0]?.ref).toBe("ACTIVITY-INTRO")
  })

  it("normalizes a missing item reference to an empty string for older campuses", () => {
    const runtime = normalizeLearningPathRuntime({
      lpId: 7,
      runtimeSupported: true,
      currentItemId: 11,
      scorm: {},
      items: [
        {
          id: 11,
          title: "Introduction",
          itemType: "sco",
          available: true,
          isSection: false,
        },
      ],
    })

    expect(runtime.items[0]?.ref).toBe("")
  })
})
