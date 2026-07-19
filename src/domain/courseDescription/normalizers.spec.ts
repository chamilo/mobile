import { describe, expect, it } from "vitest"

import {
  CourseDescriptionContractError,
  normalizeCourseDescriptionResponse,
} from "@/domain/courseDescription/normalizers"

const response = {
  items: [
    {
      iid: 12,
      title: "Objectives",
      content: "<p>Understand the course.</p>",
      descriptionType: 2,
      progress: 25,
      resourceNodeId: 42,
      sessionId: null,
      language: "english",
      isInheritedFromCourse: true,
      canEdit: false,
      canDelete: false,
    },
  ],
  totalItems: 1,
  courseId: 10,
  sessionId: 7,
  canManage: false,
  studentView: true,
  types: [{ value: 2, label: "Objectives", icon: "flag-checkered" }],
  settings: { searchEnabled: true, saveTitlesAsHtml: false },
}

describe("normalizeCourseDescriptionResponse", () => {
  it("normalizes the verified list contract", () => {
    expect(normalizeCourseDescriptionResponse(response)).toEqual({
      items: [
        {
          iid: 12,
          title: "Objectives",
          content: "<p>Understand the course.</p>",
          descriptionType: 2,
          progress: 25,
          resourceNodeId: 42,
          sessionId: null,
          language: "english",
          isInheritedFromCourse: true,
        },
      ],
      totalItems: 1,
      courseId: 10,
      sessionId: 7,
      studentView: true,
      types: [{ value: 2, label: "Objectives", icon: "flag-checkered" }],
      settings: { searchEnabled: true, saveTitlesAsHtml: false },
    })
  })

  it("rejects a total that does not match the item collection", () => {
    expect(() => normalizeCourseDescriptionResponse({ ...response, totalItems: 2 })).toThrow(
      CourseDescriptionContractError,
    )
  })
})
