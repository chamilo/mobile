import { describe, expect, it } from "vitest"

import {
  applySavedExerciseAnswer,
  buildExerciseAnswerPayload,
  createExerciseAnswerState,
  hasUnsupportedExerciseQuestions,
  isExerciseAnswerProvided,
} from "@/domain/exercises/answers"
import type { ExerciseQuestion } from "@/domain/exercises/types"

function question(type: number): ExerciseQuestion {
  return {
    id: 10,
    title: "Question",
    description: "",
    type,
    typeLabel: "Question",
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

describe("exercise answers", () => {
  it("builds the verified payload for a multiple-answer question", () => {
    const item = question(2)
    const state = createExerciseAnswerState(item)
    state.choices = [4, 8]

    expect(buildExerciseAnswerPayload(item, state)).toEqual({
      choices: [4, 8],
    })
  })

  it("restores a matching answer using row positions", () => {
    const item = question(4)
    const state = createExerciseAnswerState(item)

    applySavedExerciseAnswer(
      item,
      [
        { answer: "30", position: 10 },
        { answer: "40", position: 20 },
      ],
      state,
    )

    expect(state.matching).toEqual({ 10: 30, 20: 40 })
  })

  it("detects question types that need the campus runtime fallback", () => {
    expect(hasUnsupportedExerciseQuestions([question(23)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(1)])).toBe(false)
  })

  it("recognizes a locally selected final answer before it is saved", () => {
    const item = question(1)
    item.choices = [{ id: 4, answer: "Option", position: 1 }]
    const state = createExerciseAnswerState(item)

    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    state.choice = 4

    expect(isExerciseAnswerProvided(item, state)).toBe(true)
  })
})
