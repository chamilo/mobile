import { describe, expect, it } from "vitest"

import { createCourseToolCapabilities } from "@/domain/courseHome/toolCapabilities"
import type { CourseHomeEntry } from "@/domain/courseHome/types"

const entry: CourseHomeEntry = {
  course: {
    id: 4,
    iri: "/api/courses/4",
    title: "Session course",
    code: null,
    language: null,
    description: null,
    illustrationUrl: null,
  },
  context: {
    courseId: 4,
    sessionId: 8,
    membershipId: null,
    sessionCourseId: 17,
    source: "session",
  },
  role: "student",
  progress: null,
  sessionTitle: "Current session",
  sessionPeriod: "current",
  accessState: "available",
}

describe("createCourseToolCapabilities", () => {
  it("exposes the verified course tool contracts", () => {
    const capabilities = createCourseToolCapabilities(entry)

    expect(capabilities).toHaveLength(3)
    expect(capabilities.map(({ toolKey }) => toolKey)).toEqual([
      "announcements",
      "course-progress",
      "notebook",
    ])

    expect(capabilities[0]).toMatchObject({
      toolKey: "announcements",
      available: true,
      readOnly: true,
      apiContract: {
        list: "GET /api/announcement/list",
        detail: "GET /api/announcement/{id}",
      },
    })
    expect(capabilities[0]?.route).toEqual({
      name: "announcements",
      params: { courseId: "4" },
      query: { source: "session", sid: "8", sessionCourse: "17" },
    })
  })

  it("does not expose tools when course access is unavailable", () => {
    expect(createCourseToolCapabilities({ ...entry, accessState: "denied" })).toEqual([])
  })
})
