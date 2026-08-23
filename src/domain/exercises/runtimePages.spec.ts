import { describe, expect, it } from "vitest"

import {
  findExerciseRuntimePage,
  resolveExerciseStructuralContext,
} from "@/domain/exercises/runtimePages"
import type { ExerciseQuestion, ExerciseRuntimePage } from "@/domain/exercises/types"

function question(): ExerciseQuestion {
  return {
    id: 21,
    title: "Question",
    description: "",
    type: 1,
    typeLabel: "Unique answer",
    position: 1,
    mandatory: false,
    duration: null,
    choices: [],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: null,
    calculated: null,
    isContent: false,
  }
}

const pages: ExerciseRuntimePage[] = [
  {
    index: 0,
    number: 1,
    type: "questions",
    media: null,
    pageBreak: {
      id: 30,
      title: "Section two",
      description: "Read before continuing",
      content: null,
    },
    questionIds: [21, 22],
  },
]

describe("exercise runtime pages", () => {
  it("finds the structural page that contains an answerable question", () => {
    expect(findExerciseRuntimePage(pages, 21)?.number).toBe(1)
    expect(findExerciseRuntimePage(pages, 999)).toBeNull()
  })

  it("uses runtime page media before the question parent and keeps page-break context", () => {
    const item = question()
    item.parent = {
      id: 40,
      title: "Fallback media",
      description: "Fallback",
      type: 15,
      typeLabel: "Media question",
      content: null,
    }
    const withMedia: ExerciseRuntimePage[] = [
      {
        ...pages[0]!,
        media: {
          id: 41,
          title: "Page media",
          description: "Page context",
          type: 15,
          typeLabel: "Media question",
          content: null,
        },
      },
    ]

    const context = resolveExerciseStructuralContext(item, withMedia)

    expect(context.media?.id).toBe(41)
    expect(context.pageBreak?.id).toBe(30)
  })

  it("falls back to the question media parent when no runtime page is available", () => {
    const item = question()
    item.parent = {
      id: 40,
      title: "Fallback media",
      description: "Fallback",
      type: 15,
      typeLabel: "Media question",
      content: null,
    }

    expect(resolveExerciseStructuralContext(item, []).media?.id).toBe(40)
  })
})
