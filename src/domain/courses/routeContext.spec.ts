import { describe, expect, it } from "vitest"

import { buildCourseRoute } from "@/domain/courses/routeContext"

describe("buildCourseRoute", () => {
  it("preserves direct membership identity", () => {
    expect(
      buildCourseRoute({
        courseId: 3,
        sessionId: null,
        membershipId: 9,
        sessionCourseId: null,
        source: "direct",
      }),
    ).toEqual({
      name: "course-home",
      params: { courseId: "3" },
      query: { source: "direct", membership: "9" },
    })
  })

  it("preserves course and session identity", () => {
    expect(
      buildCourseRoute({
        courseId: 4,
        sessionId: 8,
        membershipId: null,
        sessionCourseId: 17,
        source: "session",
      }),
    ).toEqual({
      name: "course-home",
      params: { courseId: "4" },
      query: { source: "session", sid: "8", sessionCourse: "17" },
    })
  })
})
