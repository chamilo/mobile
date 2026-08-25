import { describe, expect, it } from "vitest"

import {
  buildForumLearningPathApiQuery,
  buildForumLearningPathRouteQuery,
  parseForumLearningPathRouteContext,
  parseLearningPathForumContentUrl,
  parseLearningPathThreadContentUrl,
} from "@/domain/forums/learningPathContext"

describe("forum learning path context", () => {
  it("parses a forum launch and preserves group context", () => {
    const launch = parseLearningPathForumContentUrl(
      "/resources/forum/40/forum/8?cid=16&sid=4&gid=3&origin=learnpath&gradebook=0&lp_id=7&item_id=12&returnToLp=1&embedded=1&type=step&lp_item_id=12",
      7,
      12,
      16,
      4,
      "LP one",
    )

    expect(launch).toEqual({
      forumId: 8,
      context: {
        origin: "learnpath",
        entry: "forum",
        learningPathId: 7,
        learningPathItemId: 12,
        learningPathTitle: "LP one",
        groupId: 3,
      },
    })
    expect(buildForumLearningPathApiQuery(launch?.context)).toEqual({ gid: 3 })
  })

  it("parses a thread launch and route context", () => {
    const launch = parseLearningPathThreadContentUrl(
      "/resources/forum/40/forum/8/thread/15?cid=16&sid=0&gid=0&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step&lp_item_id=13&gradebook=0",
      7,
      13,
      16,
      null,
      "LP one",
    )

    expect(launch?.forumId).toBe(8)
    expect(launch?.threadId).toBe(15)
    expect(buildForumLearningPathRouteQuery(launch?.context)).toEqual({
      origin: "learnpath",
      learningPathEntry: "thread",
      learningPathId: 7,
      learningPathItemId: 13,
      learningPathTitle: "LP one",
    })

    expect(
      parseForumLearningPathRouteContext({
        origin: "learnpath",
        learningPathEntry: "thread",
        learningPathId: "7",
        learningPathItemId: "13",
        learningPathTitle: "LP one",
        groupId: null,
      }),
    ).toEqual(launch?.context)
  })

  it("rejects mismatched or unsafe learning path destinations", () => {
    const valid =
      "/resources/forum/40/forum/8/thread/15?cid=16&sid=4&gid=0&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step&lp_item_id=13"

    expect(parseLearningPathThreadContentUrl(valid, 7, 13, 99, 4, "LP")).toBeNull()
    expect(parseLearningPathThreadContentUrl(valid, 7, 14, 16, 4, "LP")).toBeNull()
    expect(
      parseLearningPathThreadContentUrl(
        "https://other.example/resources/forum/40/forum/8/thread/15?cid=16&sid=4&gid=0&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step&lp_item_id=13",
        7,
        13,
        16,
        4,
        "LP",
      ),
    ).toBeNull()
  })
})
