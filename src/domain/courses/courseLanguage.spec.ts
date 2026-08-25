import { describe, expect, it } from "vitest"

import { findCourseLanguage } from "@/domain/courses/courseLanguage"
import type { CoursesOverview } from "@/domain/courses/types"

const overview: CoursesOverview = {
  directCourses: [
    {
      key: "direct:11",
      source: "direct",
      membershipId: 11,
      membershipIri: "/api/course_rel_users/11",
      course: {
        id: 5,
        iri: "/api/courses/5",
        title: "Direct course",
        code: "DIRECT",
        language: "en_US",
        description: null,
        illustrationUrl: null,
      },
      role: "student",
      progress: 0,
      completed: false,
      certificateAvailable: false,
      hasNewContent: false,
      hasRequirements: false,
      accessAllowed: true,
      teachers: [],
      context: {
        courseId: 5,
        sessionId: null,
        membershipId: 11,
        sessionCourseId: null,
        source: "direct",
      },
    },
  ],
  currentSessions: [
    {
      id: 9,
      iri: "/api/sessions/9",
      title: "Session",
      period: "current",
      displayStartDate: null,
      displayEndDate: null,
      durationDays: null,
      daysLeft: null,
      accessVisibility: null,
      courses: [
        {
          key: "session:9:21",
          source: "session",
          sessionCourseId: 21,
          sessionCourseIri: "/api/session_courses/21",
          course: {
            id: 6,
            iri: "/api/courses/6",
            title: "Session course",
            code: "SESSION",
            language: "es",
            description: null,
            illustrationUrl: null,
          },
          progress: 0,
          score: null,
          bestScore: null,
          timeSpentSeconds: null,
          completed: false,
          certificateAvailable: false,
          context: {
            courseId: 6,
            sessionId: 9,
            membershipId: null,
            sessionCourseId: 21,
            source: "session",
          },
        },
      ],
    },
  ],
  upcomingSessions: [],
  pastSessions: [],
  fetchedAt: "2026-08-24T00:00:00Z",
}

describe("course language", () => {
  it("resolves the direct course language", () => {
    expect(
      findCourseLanguage(overview, {
        courseId: 5,
        sessionId: null,
        membershipId: 11,
        sessionCourseId: null,
        source: "direct",
      }),
    ).toBe("en_US")
  })

  it("resolves the session course language", () => {
    expect(
      findCourseLanguage(overview, {
        courseId: 6,
        sessionId: 9,
        membershipId: null,
        sessionCourseId: 21,
        source: "session",
      }),
    ).toBe("es")
  })
})
