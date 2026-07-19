import { describe, expect, it } from "vitest"

import { createCourseToolCapabilities } from "@/domain/courseHome/toolCapabilities"
import type { CourseHomeEntry } from "@/domain/courseHome/types"

const entry: CourseHomeEntry = {
  course: {
    id: 10,
    title: "Course",
    code: "COURSE",
    visibility: 1,
    language: "english",
    illustrationUrl: null,
  },
  context: {
    courseId: 10,
    sessionId: null,
    membershipId: 1,
    sessionCourseId: null,
    source: "direct",
  },
  role: "teacher",
  progress: null,
  sessionTitle: null,
  sessionPeriod: null,
  accessState: "available",
}

describe("createCourseToolCapabilities", () => {
  it("exposes all verified course tool contracts", () => {
    expect(createCourseToolCapabilities(entry).map(({ toolKey }) => toolKey)).toEqual([
      "agenda",
      "announcements",
      "course-description",
      "documents",
      "links",
      "course-progress",
      "learning-paths",
      "exercises",
      "forums",
      "assignments",
      "surveys",
      "gradebook",
      "notebook",
    ])
  })

  it("does not expose tools for unavailable course entries", () => {
    expect(createCourseToolCapabilities({ ...entry, accessState: "denied" })).toEqual([])
  })
})
