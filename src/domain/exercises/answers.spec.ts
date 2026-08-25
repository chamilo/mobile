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
    onlyoffice: null,
    annotation: null,
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

  it("keeps only unfinished question families on the campus runtime fallback", () => {
    expect(hasUnsupportedExerciseQuestions([question(13)])).toBe(false)
    expect(hasUnsupportedExerciseQuestions([question(23)])).toBe(false)
    expect(hasUnsupportedExerciseQuestions([question(20)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(30)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(1)])).toBe(false)
  })

  it("restores uploaded answer files as a provided answer", () => {
    const item = question(23)
    const state = createExerciseAnswerState(item)

    applySavedExerciseAnswer(
      item,
      [
        {
          answer: "",
          position: 0,
          files: [
            {
              id: 55,
              name: "report.pdf",
              size: 1024,
              mimeType: "application/pdf",
              url: "/api/exercise/runtime/1/attempt/2/file/55/download?cid=14",
              inlineUrl: null,
            },
          ],
        },
      ],
      state,
    )

    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(state.uploadedFiles).toHaveLength(1)
    expect(state.uploadedFiles[0]?.name).toBe("report.pdf")
    expect(buildExerciseAnswerPayload(item, state)).toEqual({})
  })

  it("supports Office document answers when the verified template runtime is available", () => {
    const item = question(30)
    item.onlyoffice = {
      templateName: "template.docx",
      templateUrl: "/r/resource/77/view?cid=14&sid=0&gid=0",
      editorUrl:
        "/plugin/Onlyoffice/editor.php?resourceNodeId=88&exerciseId=7&exeId=9&questionId=30",
      manualCorrection: true,
    }
    const state = createExerciseAnswerState(item)

    expect(hasUnsupportedExerciseQuestions([item])).toBe(false)
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    applySavedExerciseAnswer(
      item,
      [
        {
          answer: "onlyoffice:88",
          position: 0,
          files: [
            {
              id: 88,
              name: "template.docx",
              size: 4096,
              mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              url: "/api/exercise/runtime/7/attempt/9/file/88/download?cid=14",
              inlineUrl: null,
            },
          ],
        },
      ],
      state,
    )

    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(state.uploadedFiles[0]?.name).toBe("template.docx")
    expect(buildExerciseAnswerPayload(item, state)).toEqual({})
  })

  it("supports saved and local annotation answers when an image runtime is available", () => {
    const item = question(20)
    item.annotation = {
      imageName: "diagram.png",
      imageUrl: "/r/resource/20/view?cid=14&sid=0&gid=0",
    }
    const state = createExerciseAnswerState(item)

    expect(hasUnsupportedExerciseQuestions([item])).toBe(false)
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    applySavedExerciseAnswer(
      item,
      [
        {
          answer: "P)(10;20)(30;40|T)(Label)(50;60",
          position: 0,
        },
      ],
      state,
    )

    expect(state.annotationPaths).toEqual([
      {
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      },
    ])
    expect(state.annotationTexts).toEqual([{ text: "Label", x: 50, y: 60 }])
    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({
      paths: [
        {
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        },
      ],
      texts: [{ text: "Label", x: 50, y: 60 }],
    })
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

    applySavedExerciseAnswer(hotspot, [{ answer: "120;75|260;190", position: 0 }], state)

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


  it("requires a degree of certainty for every type 22 answer", () => {
    const item = question(22)
    item.choices = [
      { id: 101, answer: "Statement A", position: 1 },
      { id: 102, answer: "Statement B", position: 2 },
    ]
    item.trueFalseOptions = [
      { id: 1, title: "True", position: 1 },
      { id: 2, title: "False", position: 2 },
      { id: 3, title: "50%", position: 3 },
      { id: 4, title: "75%", position: 4 },
    ]
    const state = createExerciseAnswerState(item)

    state.trueFalse = { 101: 1, 102: 2 }
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    state.degreeCertainty = { 101: 3 }
    expect(isExerciseAnswerProvided(item, state)).toBe(false)

    state.degreeCertainty = { 101: 3, 102: 4 }
    expect(isExerciseAnswerProvided(item, state)).toBe(true)
    expect(buildExerciseAnswerPayload(item, state)).toEqual({
      trueFalse: { 101: 1, 102: 2 },
      degreeCertainty: { 101: 3, 102: 4 },
    })
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
