import { describe, expect, it } from "vitest"

import {
  CourseContractError,
  extractNumericId,
  normalizeCourseSession,
  normalizeDirectCourseEnrollment,
  normalizeHydraCollection,
} from "@/domain/courses/normalizers"

describe("course response normalizers", () => {
  it("extracts API Platform numeric identifiers", () => {
    expect(extractNumericId("/api/course_rel_users/42")).toBe(42)
    expect(extractNumericId("/api/courses/7.jsonld?page=1")).toBe(7)
    expect(extractNumericId("invalid")).toBeNull()
  })

  it("normalizes direct course enrollment and preserves membership identity", () => {
    expect(
      normalizeDirectCourseEnrollment({
        "@id": "/api/course_rel_users/9",
        status: 5,
        trackingProgress: 44.6,
        completed: false,
        hasNewContent: true,
        allowSubscription: true,
        teachersLite: [{ id: 2, fullName: "Teacher One", illustrationUrl: null }],
        course: {
          "@id": "/api/courses/3",
          id: 3,
          title: "Mobile course",
          code: "MOBILE",
          courseLanguage: "english",
        },
      }),
    ).toMatchObject({
      membershipId: 9,
      role: "student",
      progress: 45,
      hasNewContent: true,
      context: {
        courseId: 3,
        sessionId: null,
        membershipId: 9,
        source: "direct",
      },
    })
  })

  it("normalizes session courses and preserves session context", () => {
    const session = normalizeCourseSession(
      {
        "@id": "/api/sessions/8",
        id: 8,
        title: "Current session",
        courses: [
          {
            "@id": "/api/session_rel_courses/17",
            course: {
              "@id": "/api/courses/4",
              id: 4,
              title: "Session course",
            },
          },
        ],
      },
      "current",
    )

    expect(session.courses[0]?.context).toEqual({
      courseId: 4,
      sessionId: 8,
      membershipId: null,
      sessionCourseId: 17,
      source: "session",
    })
  })

  it("rejects non-Hydra collection responses", () => {
    expect(() => normalizeHydraCollection({ items: [] })).toThrow(CourseContractError)
  })

  it("rejects course entries without a stable identity", () => {
    expect(() =>
      normalizeDirectCourseEnrollment({
        "@id": "/api/course_rel_users/1",
        course: { title: "Missing ID" },
      }),
    ).toThrow(CourseContractError)
  })
})
