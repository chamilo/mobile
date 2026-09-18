import { describe, expect, it } from "vitest"

import { translatedPlainText } from "@/domain/content/translatedHtml"
import { normalizeCourseProgressResponse } from "./normalizers"
describe("normalizeCourseProgressResponse", () => {
  it("normalizes an empty student response", () => {
    expect(
      normalizeCourseProgressResponse({
        courseId: 1,
        sessionId: 1,
        studentView: true,
        totalAverage: 0,
        totalItems: 0,
        items: [],
      }),
    ).toEqual({
      courseId: 1,
      sessionId: 1,
      studentView: true,
      totalAverage: 0,
      totalItems: 0,
      items: [],
    })
  })

  it("preserves translatable thematic HTML until the presentation locale is known", () => {
    const result = normalizeCourseProgressResponse({
      courseId: 1,
      sessionId: null,
      studentView: true,
      totalAverage: 0,
      totalItems: 1,
      items: [
        {
          iid: 2,
          title: [
            '<span class="mce-translatehtml" lang="en">English thematic</span>',
            '<span class="mce-translatehtml" lang="es">Temática española</span>',
          ].join(""),
          content: [
            '<div class="mce-translatehtml" lang="en">English content</div>',
            '<div class="mce-translatehtml" lang="es">Contenido español</div>',
          ].join(""),
          isInheritedFromCourse: false,
          average: 0,
          plans: [],
          advances: [],
        },
      ],
    })

    expect(translatedPlainText(result.items[0]!.title, "es")).toBe("Temática española")
    expect(translatedPlainText(result.items[0]!.content, "es")).toBe("Contenido español")
  })
})
