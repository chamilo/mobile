import { describe, expect, it } from "vitest"

import {
  applySavedExerciseAnswer,
  buildExerciseAnswerPayload,
  createExerciseAnswerState,
  isExerciseAnswerProvided,
} from "@/domain/exercises/answers"
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

function dropdownQuestion(type = 29): ExerciseQuestion {
  return {
    id: type,
    title: "Multiple answer dropdown",
    description: "",
    type,
    typeLabel: type === 28 ? "Multiple answer dropdown combination" : "Multiple answer dropdown",
    position: 1,
    mandatory: false,
    duration: null,
    choices: [],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: {
      options: [
        { id: 201, answer: "Alpha", position: 1 },
        { id: 202, answer: "Beta", position: 2 },
        { id: 203, answer: "Gamma", position: 3 },
      ],
    },
    calculated: null,
    reading: null,
    onlyoffice: null,
    annotation: null,
    hotspot: null,
    isContent: false,
  }
}

describe("multiple answer dropdown state", () => {
  it.each([28, 29])("starts with an empty multi-selection for type %s", (type) => {
    const state = createExerciseAnswerState(dropdownQuestion(type))

    expect(state.dropdown).toEqual([])
  })

  it.each([28, 29])("upgrades a legacy single dropdown selection for type %s", (type) => {
    const question = dropdownQuestion(type)
    const state = createExerciseAnswerState(question)
    state.dropdown = 202

    expect(isExerciseAnswerProvided(question, state)).toBe(true)
    expect(buildExerciseAnswerPayload(question, state)).toEqual({ choices: [202] })
  })

  it.each([28, 29])("restores every saved dropdown selection for type %s", (type) => {
    const question = dropdownQuestion(type)
    const state = createExerciseAnswerState(question)
    const rows: SavedAnswerRow[] = [
      { answer: "201", position: 0 },
      { answer: "203", position: 1 },
    ]

    applySavedExerciseAnswer(question, rows, state)

    expect(state.dropdown).toEqual([201, 203])
    expect(isExerciseAnswerProvided(question, state)).toBe(true)
    expect(buildExerciseAnswerPayload(question, state)).toEqual({ choices: [201, 203] })
  })
})
