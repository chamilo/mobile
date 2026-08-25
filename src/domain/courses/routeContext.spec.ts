import { describe, expect, it } from "vitest"

import {
  buildAnnouncementsRoute,
  buildCourseRoute,
  buildSurveyDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"

const directContext = {
  courseId: 3,
  sessionId: null,
  membershipId: 9,
  sessionCourseId: null,
  source: "direct" as const,
}

const sessionContext = {
  courseId: 4,
  sessionId: 8,
  membershipId: null,
  sessionCourseId: 17,
  source: "session" as const,
}

describe("course route context", () => {
  it("preserves direct membership identity", () => {
    expect(buildCourseRoute(directContext)).toEqual({
      name: "course-home",
      params: { courseId: "3" },
      query: { source: "direct", membership: "9" },
    })
  })

  it("preserves course and session identity", () => {
    expect(buildCourseRoute(sessionContext)).toEqual({
      name: "course-home",
      params: { courseId: "4" },
      query: { source: "session", sid: "8", sessionCourse: "17" },
    })
  })

  it("preserves context when opening announcements", () => {
    expect(buildAnnouncementsRoute(sessionContext)).toEqual({
      name: "announcements",
      params: { courseId: "4" },
      query: { source: "session", sid: "8", sessionCourse: "17" },
    })
  })

  it("preserves the survey invitation when opening offline answer details", () => {
    expect(
      buildSurveyDetailRoute(sessionContext, 12, "answer", "Feedback", 27, "invite-12"),
    ).toEqual({
      name: "survey-detail",
      params: { courseId: "4", surveyId: "12" },
      query: {
        source: "session",
        sid: "8",
        sessionCourse: "17",
        surveyTitle: "Feedback",
        mode: "answer",
        lpItemId: "27",
        invitationCode: "invite-12",
      },
    })
  })

  it("preserves learning path context when opening a survey from a lesson", () => {
    expect(
      buildSurveyDetailRoute(
        sessionContext,
        12,
        "answer",
        "Lesson feedback",
        27,
        "auto",
        6,
        "First lesson",
      ),
    ).toEqual({
      name: "survey-detail",
      params: { courseId: "4", surveyId: "12" },
      query: {
        source: "session",
        sid: "8",
        sessionCourse: "17",
        surveyTitle: "Lesson feedback",
        mode: "answer",
        lpItemId: "27",
        invitationCode: "auto",
        learningPathId: "6",
        learningPathTitle: "First lesson",
      },
    })
  })

  it("parses a complete direct context", () => {
    expect(
      parseCourseRouteContext({
        courseId: "3",
        source: "direct",
        sessionId: null,
        membershipId: "9",
        sessionCourseId: null,
      }),
    ).toEqual(directContext)
  })

  it("rejects mixed direct and session identifiers", () => {
    expect(() =>
      parseCourseRouteContext({
        courseId: "3",
        source: "direct",
        sessionId: "8",
        membershipId: "9",
        sessionCourseId: null,
      }),
    ).toThrow(CourseRouteContextError)
  })
})
