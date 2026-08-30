import { describe, expect, it } from "vitest"

import { applySavedExerciseAnswer, createExerciseAnswerState } from "@/domain/exercises/answers"
import type { ExerciseQuestion, SavedAnswerRow } from "@/domain/exercises/types"

function draggableQuestion(): ExerciseQuestion {
  return {
    id: 18,
    title: "Sequence ordering",
    description: "",
    type: 18,
    typeLabel: "Sequence ordering",
    position: 1,
    mandatory: false,
    duration: null,
    choices: [],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: {
      items: [
        { id: 101, answer: "First", position: 3 },
        { id: 102, answer: "Second", position: 4 },
      ],
    },
    dropdown: null,
    calculated: null,
    reading: null,
    onlyoffice: null,
    annotation: null,
    hotspot: null,
    isContent: false,
  }
}

describe("exercise answers", () => {
  it("keeps the initial draggable order when the question has no saved answer yet", () => {
    const question = draggableQuestion()
    const state = createExerciseAnswerState(question)

    applySavedExerciseAnswer(question, [], state)

    expect(state.order).toEqual([101, 102])
  })

  it("restores a saved draggable order and appends any missing current item", () => {
    const question = draggableQuestion()
    const state = createExerciseAnswerState(question)
    const rows: SavedAnswerRow[] = [
      { answer: "1", position: 102 },
      { answer: "2", position: 999 },
    ]

    applySavedExerciseAnswer(question, rows, state)

    expect(state.order).toEqual([102, 101])
  })
})
