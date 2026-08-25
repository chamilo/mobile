import { describe, expect, it } from "vitest"

import {
  applySavedExerciseAnswer,
  buildExerciseAnswerPayload,
  createExerciseAnswerState,
  hasUnsupportedExerciseQuestions,
  isExerciseAnswerProvided,
  isStructuralExerciseQuestion,
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
    reading: null,
    hotspot: null,
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

  it("treats reading comprehension as a native single-choice question", () => {
    const item = question(21)
    item.choices = [
      { id: 101, answer: "First option", position: 1 },
      { id: 102, answer: "Second option", position: 2 },
    ]
    item.reading = { speed: 175, text: "A short reading passage." }
    const state = createExerciseAnswerState(item)

    expect(isStructuralExerciseQuestion(item)).toBe(false)
    expect(hasUnsupportedExerciseQuestions([item])).toBe(false)
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    applySavedExerciseAnswer(item, [{ answer: "101", position: null }], state)
    expect(state.choice).toBe(101)

    state.choice = 102

    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({ choice: 102 })
  })

  it("supports saved and local hotspot points for regular and delineation questions", () => {
    const hotspot = question(6)
    hotspot.hotspot = {
      imageName: "map.png",
      imageUrl: "/r/resource/1/view?cid=14&sid=0&gid=0",
      maxClicks: 2,
      combination: false,
      delineation: false,
      zones: [],
    }
    const state = createExerciseAnswerState(hotspot)

    applySavedExerciseAnswer(
      hotspot,
      [{ answer: "120;75|260;190", position: 0 }],
      state,
    )

    expect(hasUnsupportedExerciseQuestions([hotspot])).toBe(false)
    expect(
      [6, 8, 26].every((type) => {
        const candidate = question(type)
        candidate.hotspot = {
          imageName: "map.png",
          imageUrl: "/r/resource/1/view?cid=14&sid=0&gid=0",
          maxClicks: 2,
          combination: type === 26,
          delineation: type === 8,
          zones: [],
        }

        return !hasUnsupportedExerciseQuestions([candidate])
      }),
    ).toBe(true)
    expect(isExerciseAnswerProvided(hotspot, state)).toBe(true)
    expect(buildExerciseAnswerPayload(hotspot, state)).toEqual({
      points: [
        { x: 120, y: 75 },
        { x: 260, y: 190 },
      ],
    })

    const delineation = question(8)
    delineation.hotspot = {
      imageName: "body.png",
      imageUrl: "/r/resource/2/view?cid=14&sid=0&gid=0",
      maxClicks: 1,
      combination: false,
      delineation: true,
      zones: [],
    }
    const delineationState = createExerciseAnswerState(delineation)
    delineationState.hotspotPoints = [
      { x: 10, y: 10 },
      { x: 80, y: 10 },
    ]
    expect(isExerciseAnswerProvided(delineation, delineationState)).toBe(false)

    delineationState.hotspotPoints.push({ x: 40, y: 70 })
    expect(isExerciseAnswerProvided(delineation, delineationState)).toBe(true)
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
