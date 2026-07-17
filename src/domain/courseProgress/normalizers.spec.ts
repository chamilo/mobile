import { describe, expect, it } from "vitest"
import { normalizeCourseProgressResponse } from "./normalizers"
describe("normalizeCourseProgressResponse", () => {
  it("normalizes an empty student response", () => {
    expect(
      normalizeCourseProgressResponse({
        courseId: 1,
        sessionId: 1,
        studentView: true,
        totalAverage: 0,
        totalItems: 0,
        items: [],
      }),
    ).toEqual({
      courseId: 1,
      sessionId: 1,
      studentView: true,
      totalAverage: 0,
      totalItems: 0,
      items: [],
    })
  })
})
