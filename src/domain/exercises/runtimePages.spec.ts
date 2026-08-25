import { describe, expect, it } from "vitest"

import {
  exerciseRuntimePagesRequireCampus,
  normalizeExerciseRuntimePages,
  sanitizeExerciseStructuralHtml,
  usesExerciseRuntimePages,
} from "@/domain/exercises/runtimePages"
import type { ExerciseQuestion } from "@/domain/exercises/types"

function question(id: number): ExerciseQuestion {
  return {
    id,
    title: `Question ${id}`,
    description: "",
    type: 1,
    typeLabel: "Unique answer",
    position: id,
    mandatory: false,
    duration: null,
    choices: [],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: null,
    calculated: null,
    reading: null,
    onlyoffice: null,
    annotation: null,
    hotspot: null,
    isContent: false,
  }
}

describe("exercise runtime pages", () => {
  it("normalizes verified media groups and page-break pages", () => {
    const pages = normalizeExerciseRuntimePages(
      {
        usesStructuralPages: true,
        effectiveOneQuestionPerPage: true,
        runtimePages: [
          {
            type: "media_group",
            media: {
              id: 15,
              title: "Read this",
              content: { description: "<p>Context</p>" },
            },
            questionIds: [1, 2, 999],
          },
          {
            type: "questions",
            pageBreak: { id: 31, title: "Part two", description: "Continue" },
            questionIds: [3],
          },
        ],
      },
      [question(1), question(2), question(3)],
    )

    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({
      index: 0,
      number: 1,
      type: "media_group",
      questionIds: [1, 2],
      media: { id: 15, title: "Read this", description: "<p>Context</p>" },
    })
    expect(pages[1]?.pageBreak?.title).toBe("Part two")
    expect(usesExerciseRuntimePages({ usesStructuralPages: true }, pages)).toBe(true)
  })

  it("requires campus when structural HTML references protected or embedded content", () => {
    const base = {
      index: 0,
      number: 1,
      type: "media_group",
      questionIds: [1],
      pageBreak: null,
    }

    expect(
      exerciseRuntimePagesRequireCampus([
        { ...base, media: { id: 15, title: "", description: '<img src="/r/resource/1/view">' } },
      ]),
    ).toBe(true)
    expect(
      exerciseRuntimePagesRequireCampus([
        {
          ...base,
          media: {
            id: 15,
            title: "",
            description: '<iframe src="https://video.example/embed"></iframe>',
          },
        },
      ]),
    ).toBe(true)
    expect(
      exerciseRuntimePagesRequireCampus(
        [
          {
            ...base,
            media: {
              id: 15,
              title: "",
              description: '<img src="https://campus.example.org/r/resource/1/view">',
            },
          },
        ],
        "https://campus.example.org",
      ),
    ).toBe(true)
    expect(
      exerciseRuntimePagesRequireCampus([
        {
          ...base,
          media: {
            id: 15,
            title: "",
            description: '<img src="https://cdn.example/image.png">',
          },
        },
      ]),
    ).toBe(false)
  })

  it("sanitizes allowed public structural HTML", () => {
    const html = sanitizeExerciseStructuralHtml(
      [
        '<p onclick="alert(1)">Read <strong>this</strong>.</p>',
        "<script>alert(1)</script>",
        '<a href="https://example.org">More</a>',
      ].join(""),
      "en",
    )

    expect(html).toContain("<strong>this</strong>")
    expect(html).not.toContain("onclick")
    expect(html).not.toContain("<script")
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
