import { describe, expect, it } from "vitest"

import { buildCourseToolRequest, normalizeCourseToolResponse } from "@/domain/courseTools/contracts"

const context = {
  course: {
    courseId: 10,
    sessionId: 7,
    membershipId: null,
    sessionCourseId: 2,
    source: "session" as const,
  },
  user: {
    id: 1,
    username: "student",
    firstname: "Test",
    lastname: "User",
    fullName: "Test User",
    email: "student@example.org",
    locale: "en",
    timezone: "UTC",
    roles: ["ROLE_USER"],
  },
  courseResourceNodeId: 100,
}

describe("accelerated course tool contracts", () => {
  it("builds verified learning path context parameters", () => {
    expect(buildCourseToolRequest("learning-paths", context)).toEqual({
      path: "/api/learning_paths",
      query: {
        cid: 10,
        "resourceNode.parent": 100,
        sid: 7,
        itemsPerPage: 5000,
      },
    })
  })

  it("builds the verified exercise attempt-history request", () => {
    expect(buildCourseToolRequest("exercises", context)).toEqual({
      path: "/api/track_e_exercises",
      query: {
        user: "/api/users/1",
        course: "/api/courses/10",
        session: "/api/sessions/7",
        itemsPerPage: 5000,
        "order[startDate]": "desc",
      },
    })
  })

  it("normalizes the verified exercise attempt runtime contract", () => {
    const result = normalizeCourseToolResponse("exercises", {
      "hydra:member": [
        {
          exeId: 14,
          quiz: {
            iid: 38,
          },
          score: 5,
          maxScore: 20,
          status: "",
          startDate: "2026-07-19T01:29:54+00:00",
          exeDate: "2026-07-19T01:30:10+00:00",
          exeDuration: 15,
          stepsCounter: 0,
          origLpId: 0,
          attempts: [
            "/api/track_e_attempts/36",
            "/api/track_e_attempts/37",
            "/api/track_e_attempts/38",
            "/api/track_e_attempts/39",
          ],
          revised: false,
        },
      ],
      "hydra:totalItems": 1,
    })

    expect(result.items[0]).toMatchObject({
      id: "14",
      title: "Exercise #38",
      description: "",
      score: "5 / 20",
      status: null,
    })
    expect(result.items[0]?.metadata).toContain("Duration: 15 s")
    expect(result.items[0]?.metadata).toContain("Question records: 4")
    expect(result.items[0]?.metadata).not.toContain("Learning path attempt")
    expect(result.items[0]?.metadata.some((item) => item.startsWith("Started: "))).toBe(true)
    expect(result.items[0]?.metadata.some((item) => item.startsWith("Finished: "))).toBe(true)
    expect(result).toMatchObject({
      totalItems: 1,
      warningKey: "acceleratedTools.exercises.attemptHistoryNotice",
    })
  })

  it("normalizes a learning path collection", () => {
    const result = normalizeCourseToolResponse("learning-paths", {
      "hydra:member": [
        {
          iid: 4,
          title: "Introduction",
          description: "Start here",
          progress: 40,
          visible: true,
        },
      ],
    })

    expect(result.items[0]).toMatchObject({
      id: "4",
      title: "Introduction",
      progress: 40,
      status: "Visible",
    })
  })
})
