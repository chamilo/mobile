import { describe, expect, it } from "vitest"

import {
  buildOfflineCoursePackKey,
  buildOfflineCoursePackSnapshotKey,
  OFFLINE_COURSE_PACK_TOOL_OPTIONS,
} from "@/domain/offline/coursePackTypes"

const context = {
  courseId: 16,
  sessionId: 8,
  membershipId: null,
  sessionCourseId: 20,
  source: "session" as const,
}

describe("offline course pack types", () => {
  it("builds a stable context-specific course key", () => {
    expect(buildOfflineCoursePackKey(context)).toBe("16:8:0:20:session")
    expect(buildOfflineCoursePackSnapshotKey(context)).toBe("course-pack:16:8:0:20:session")
  })

  it("marks exercises and surveys as available after explicit preparation", () => {
    const compatibility = Object.fromEntries(
      OFFLINE_COURSE_PACK_TOOL_OPTIONS.map(({ key, compatibility: value }) => [key, value]),
    )

    expect(compatibility.exercises).toBe("available_offline")
    expect(compatibility.surveys).toBe("available_offline")
  })

  it("includes every currently supported course tool in the download selector", () => {
    expect(OFFLINE_COURSE_PACK_TOOL_OPTIONS.map(({ key }) => key)).toEqual([
      "course-home",
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
})
