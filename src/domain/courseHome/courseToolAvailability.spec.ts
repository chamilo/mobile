import { describe, expect, it } from "vitest"

import {
  buildCourseToolAvailabilityRequest,
  normalizeAvailableCourseTools,
} from "@/domain/courseHome/courseToolAvailability"

const context = {
  courseId: 10,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("course tool availability contract", () => {
  it("builds the current course and session request", () => {
    expect(buildCourseToolAvailabilityRequest(context)).toEqual({
      path: "/api/c_tools",
      query: {
        cid: 10,
        sid: 4,
        itemsPerPage: 5000,
        "order[position]": "asc",
      },
    })
  })

  it("maps known backend tool names and ignores unknown tools", () => {
    expect(
      normalizeAvailableCourseTools(
        {
          "hydra:member": [
            { visibility: true, tool: { title: "document" } },
            { visibility: true, tool: { title: "learnpath" } },
            { visibility: true, tool: { title: "student_publication" } },
            { visibility: true, tool: { title: "plugin_custom" } },
          ],
        },
        "student",
      ),
    ).toEqual(["documents", "learning-paths", "assignments"])
  })

  it("does not expose an explicitly hidden tool to a learner", () => {
    expect(
      normalizeAvailableCourseTools(
        [
          { visibility: false, tool: { title: "forum" } },
          { visibility: true, tool: { title: "announcement" } },
        ],
        "student",
      ),
    ).toEqual(["announcements"])
  })

  it("keeps returned hidden tools available to teachers", () => {
    expect(
      normalizeAvailableCourseTools([{ visibility: false, tool: { title: "forum" } }], "teacher"),
    ).toEqual(["forums"])
  })
})
