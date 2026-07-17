import { describe, expect, it } from "vitest"

import { resolveCourseHomeEntry } from "@/domain/courseHome/resolveCourseHome"
import type { CoursesOverview } from "@/domain/courses/types"

const overview: CoursesOverview = {
  directCourses: [
    {
      key: "direct:9",
      source: "direct",
      membershipId: 9,
      membershipIri: "/api/course_rel_users/9",
      course: {
        id: 3,
        iri: "/api/courses/3",
        title: "Direct course",
        code: "DIRECT",
        language: "english",
        description: null,
        illustrationUrl: null,
      },
      role: "student",
      progress: 35,
      completed: false,
      certificateAvailable: false,
      hasNewContent: false,
      hasRequirements: false,
      accessAllowed: true,
      teachers: [],
      context: {
        courseId: 3,
        sessionId: null,
        membershipId: 9,
        sessionCourseId: null,
        source: "direct",
      },
    },
  ],
  currentSessions: [
    {
      id: 8,
      iri: "/api/sessions/8",
      title: "Current session",
      period: "current",
      displayStartDate: null,
      displayEndDate: null,
      durationDays: null,
      daysLeft: null,
      accessVisibility: null,
      courses: [
        {
          key: "session:8:17",
          source: "session",
          sessionCourseId: 17,
          sessionCourseIri: "/api/session_rel_courses/17",
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
        },
      ],
    },
  ],
  upcomingSessions: [],
  pastSessions: [],
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

describe("resolveCourseHomeEntry", () => {
  it("resolves a direct membership without merging by course id", () => {
    const result = resolveCourseHomeEntry(overview, {
      courseId: 3,
      sessionId: null,
      membershipId: 9,
      sessionCourseId: null,
      source: "direct",
    })

    expect(result?.course.title).toBe("Direct course")
    expect(result?.progress).toBe(35)
    expect(result?.accessState).toBe("available")
  })

  it("resolves a session course with its session identity", () => {
    const result = resolveCourseHomeEntry(overview, {
      courseId: 4,
      sessionId: 8,
      membershipId: null,
      sessionCourseId: 17,
      source: "session",
    })

    expect(result?.course.title).toBe("Session course")
    expect(result?.sessionTitle).toBe("Current session")
    expect(result?.sessionPeriod).toBe("current")
  })

  it("rejects a mismatched direct membership", () => {
    expect(
      resolveCourseHomeEntry(overview, {
        courseId: 3,
        sessionId: null,
        membershipId: 99,
        sessionCourseId: null,
        source: "direct",
      }),
    ).toBeNull()
  })

  it("maps blocked requirements to denied access", () => {
    const blockedOverview: CoursesOverview = {
      ...overview,
      directCourses: [
        {
          ...overview.directCourses[0]!,
          accessAllowed: false,
          hasRequirements: true,
        },
      ],
    }

    expect(
      resolveCourseHomeEntry(blockedOverview, {
        courseId: 3,
        sessionId: null,
        membershipId: 9,
        sessionCourseId: null,
        source: "direct",
      })?.accessState,
    ).toBe("denied")
  })

  it("maps unavailable direct access without requirements to closed", () => {
    const closedOverview: CoursesOverview = {
      ...overview,
      directCourses: [
        {
          ...overview.directCourses[0]!,
          accessAllowed: false,
          hasRequirements: false,
        },
      ],
    }

    expect(
      resolveCourseHomeEntry(closedOverview, {
        courseId: 3,
        sessionId: null,
        membershipId: 9,
        sessionCourseId: null,
        source: "direct",
      })?.accessState,
    ).toBe("closed")
  })
})
