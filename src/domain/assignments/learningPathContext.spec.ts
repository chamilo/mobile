import { describe, expect, it } from "vitest"

import { parseLearningPathAssignmentContentUrl } from "@/domain/assignments/learningPathContext"

describe("Learning Path assignment context", () => {
  it("parses a verified assignment launch URL", () => {
    expect(
      parseLearningPathAssignmentContentUrl(
        "/resources/assignment/88/submission/23?cid=10&sid=4&gid=0&origin=learnpath&gradebook=0&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step",
        7,
        13,
        10,
        4,
        "Module 1",
      ),
    ).toEqual({
      assignmentId: 23,
      learningPathId: 7,
      learningPathItemId: 13,
      learningPathTitle: "Module 1",
    })
  })

  it("accepts a direct-course launch with sid zero", () => {
    expect(
      parseLearningPathAssignmentContentUrl(
        "/resources/assignment/88/submission/23?cid=10&sid=0&gid=0&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step",
        7,
        13,
        10,
        null,
        "Module 1",
      )?.assignmentId,
    ).toBe(23)
  })

  it("rejects mismatched Learning Path, item, course or session context", () => {
    const url =
      "/resources/assignment/88/submission/23?cid=10&sid=4&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step"

    expect(parseLearningPathAssignmentContentUrl(url, 8, 13, 10, 4, "")).toBeNull()
    expect(parseLearningPathAssignmentContentUrl(url, 7, 14, 10, 4, "")).toBeNull()
    expect(parseLearningPathAssignmentContentUrl(url, 7, 13, 11, 4, "")).toBeNull()
    expect(parseLearningPathAssignmentContentUrl(url, 7, 13, 10, 5, "")).toBeNull()
    expect(
      parseLearningPathAssignmentContentUrl(
        url.replace("sid=4", "sid=4&gid=9"),
        7,
        13,
        10,
        4,
        "",
      ),
    ).toBeNull()
  })

  it("rejects non-Learning-Path or external assignment URLs", () => {
    expect(
      parseLearningPathAssignmentContentUrl(
        "/resources/assignment/88/submission/23?cid=10&sid=4&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step",
        7,
        13,
        10,
        4,
        "",
      ),
    ).toBeNull()

    expect(
      parseLearningPathAssignmentContentUrl(
        "https://example.org/resources/assignment/88/submission/23?cid=10&sid=4&origin=learnpath&lp_id=7&item_id=13&returnToLp=1&embedded=1&type=step",
        7,
        13,
        10,
        4,
        "",
      ),
    ).toBeNull()
  })
})
