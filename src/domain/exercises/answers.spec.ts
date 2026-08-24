import { describe, expect, it } from "vitest"

import {
  applySavedExerciseAnswer,
  buildExerciseAnswerPayload,
  createExerciseAnswerState,
  hasUnsupportedExerciseQuestions,
  isExerciseAnswerProvided,
  isStructuralExerciseQuestion,
  isSupportedExerciseQuestion,
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

  it("treats reading comprehension as an answerable unique-choice question", () => {
    const item = question(21)
    item.choices = [
      { id: 41, answer: "First", position: 1 },
      { id: 42, answer: "Second", position: 2 },
    ]
    item.reading = { speed: 175, text: "Read this passage." }
    const state = createExerciseAnswerState(item)

    expect(isStructuralExerciseQuestion(item)).toBe(false)
    expect(isSupportedExerciseQuestion(item)).toBe(true)
    expect(hasUnsupportedExerciseQuestions([item])).toBe(false)

    state.choice = 42

    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({ choice: 42 })
  })

  it("keeps media questions and page breaks structural", () => {
    const media = question(15)
    media.isContent = true
    const pageBreak = question(31)
    pageBreak.isContent = true

    expect(isStructuralExerciseQuestion(media)).toBe(true)
    expect(isStructuralExerciseQuestion(pageBreak)).toBe(true)
    expect(hasUnsupportedExerciseQuestions([media, pageBreak])).toBe(false)
  })
})

describe("image exercise answers", () => {
  it("builds and restores hotspot point payloads", () => {
    const item = question(6)
    item.hotspot = {
      imageName: "zones.png",
      imageUrl: "/r/question/file?mode=view",
      maxClicks: 2,
      combination: false,
      delineation: false,
      zones: [],
    }
    const state = createExerciseAnswerState(item)
    state.hotspotPoints = [
      { x: 120, y: 80 },
      { x: 250, y: 190 },
    ]

    expect(isSupportedExerciseQuestion(item)).toBe(true)
    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({
      points: [
        { x: 120, y: 80 },
        { x: 250, y: 190 },
      ],
    })

    const restored = createExerciseAnswerState(item)
    applySavedExerciseAnswer(item, [{ answer: "120;80|250;190", position: 0 }], restored)
    expect(restored.hotspotPoints).toEqual(state.hotspotPoints)
  })

  it("requires at least three points for hotspot delineation", () => {
    const item = question(8)
    item.hotspot = {
      imageName: "delineation.png",
      imageUrl: "/r/question/file?mode=view",
      maxClicks: 1,
      combination: false,
      delineation: true,
      zones: [],
    }
    const state = createExerciseAnswerState(item)
    state.hotspotPoints = [
      { x: 10, y: 10 },
      { x: 80, y: 10 },
    ]
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    state.hotspotPoints.push({ x: 50, y: 70 })
    expect(isExerciseAnswerProvided(item, state)).toBe(true)
  })

  it("builds and restores annotation paths and text", () => {
    const item = question(20)
    item.annotation = {
      imageName: "annotation.png",
      imageUrl: "/r/question/file?mode=view",
    }
    const state = createExerciseAnswerState(item)
    state.annotationPaths = [
      {
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      },
    ]
    state.annotationTexts = [{ text: "Label", x: 50, y: 60 }]

    expect(isSupportedExerciseQuestion(item)).toBe(true)
    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({
      paths: state.annotationPaths,
      texts: state.annotationTexts,
    })

    const restored = createExerciseAnswerState(item)
    applySavedExerciseAnswer(
      item,
      [{ answer: "P)(10;20)(30;40|T)(Label)(50;60", position: 0 }],
      restored,
    )
    expect(restored.annotationPaths).toEqual(state.annotationPaths)
    expect(restored.annotationTexts).toEqual(state.annotationTexts)
  })

  it("keeps oral, upload and OnlyOffice questions on the campus fallback", () => {
    expect(hasUnsupportedExerciseQuestions([question(13)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(23)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(30)])).toBe(true)

    const hotspotTypes = [6, 8, 26].map((type) => {
      const item = question(type)
      item.hotspot = {
        imageName: "question.png",
        imageUrl: "/r/question/file?mode=view",
        maxClicks: 1,
        combination: type === 26,
        delineation: type === 8,
        zones: [],
      }
      return item
    })
    const annotation = question(20)
    annotation.annotation = {
      imageName: "annotation.png",
      imageUrl: "/r/question/file?mode=view",
    }

    expect(hasUnsupportedExerciseQuestions([...hotspotTypes, annotation])).toBe(false)
    expect(hasUnsupportedExerciseQuestions([question(6)])).toBe(true)
  })
})
