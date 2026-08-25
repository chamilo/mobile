import { describe, expect, it } from "vitest"

import {
  buildExerciseLearningPathApiQuery,
  parseExerciseLearningPathRouteContext,
  parseLearningPathQuizContentUrl,
} from "@/domain/exercises/learningPathContext"

describe("exercise learning path context", () => {
  it("parses the verified learning path quiz player URL", () => {
    const launch = parseLearningPathQuizContentUrl(
      "/resources/exercise/41/9/player?cid=14&origin=learnpath&lp_init=1&learnpath_id=7&learnpath_item_id=12&learnpath_item_view_id=33",
      7,
      12,
      "First lesson",
    )

    expect(launch).toEqual({
      exerciseId: 9,
      context: {
        origin: "learnpath",
        learningPathId: 7,
        learningPathItemId: 12,
        learningPathItemViewId: 33,
        learningPathTitle: "First lesson",
      },
    })
  })

  it("rejects a mismatched learning path item", () => {
    expect(
      parseLearningPathQuizContentUrl(
        "/resources/exercise/41/9/player?origin=learnpath&learnpath_id=7&learnpath_item_id=13",
        7,
        12,
        "First lesson",
      ),
    ).toBeNull()
  })

  it("fails closed for incomplete route context", () => {
    expect(
      parseExerciseLearningPathRouteContext({
        origin: "learnpath",
        learningPathId: "7",
        learningPathItemId: null,
        learningPathItemViewId: null,
        learningPathTitle: "First lesson",
      }),
    ).toBeNull()
  })

  it("builds the backend query without a user identifier", () => {
    expect(
      buildExerciseLearningPathApiQuery({
        origin: "learnpath",
        learningPathId: 7,
        learningPathItemId: 12,
        learningPathItemViewId: 33,
        learningPathTitle: "First lesson",
      }),
    ).toEqual({
      origin: "learnpath",
      lp_init: 1,
      learnpath_id: 7,
      learnpath_item_id: 12,
      learnpath_item_view_id: 33,
    })
  })
})
