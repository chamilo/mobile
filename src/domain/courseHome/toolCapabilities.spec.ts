import { describe, expect, it } from "vitest"

import { createCourseToolCapabilities } from "@/domain/courseHome/toolCapabilities"
import type { CourseHomeEntry, CourseToolKey } from "@/domain/courseHome/types"

const entry: CourseHomeEntry = {
  course: {
    id: 10,
    iri: "/api/courses/10",
    title: "Course",
    code: "COURSE",
    language: "english",
    description: null,
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

const allTools: CourseToolKey[] = [
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
]

describe("createCourseToolCapabilities", () => {
  it("exposes all verified tools returned by the campus", () => {
    expect(createCourseToolCapabilities(entry, allTools).map(({ toolKey }) => toolKey)).toEqual(
      allTools,
    )
  })

  it("does not expose a tool omitted by the campus permission response", () => {
    expect(
      createCourseToolCapabilities(entry, ["announcements", "documents"]).map(
        ({ toolKey }) => toolKey,
      ),
    ).toEqual(["announcements", "documents"])
  })

  it("does not expose tools for unavailable course entries", () => {
    expect(createCourseToolCapabilities({ ...entry, accessState: "denied" }, allTools)).toEqual([])
  })
})
