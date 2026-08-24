import { describe, expect, it } from "vitest"

import {
  answerKind,
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

  it("detects question types that still need the campus runtime fallback", () => {
    expect(hasUnsupportedExerciseQuestions([question(13)])).toBe(false)
    expect(hasUnsupportedExerciseQuestions([question(23)])).toBe(false)
    const office = question(30)
    office.onlyoffice = {
      templateName: "worksheet.docx",
      templateUrl: "/api/exercise/template/30",
      editorUrl: "/plugin/Onlyoffice/editor.php",
      manualCorrection: true,
    }
    expect(hasUnsupportedExerciseQuestions([office])).toBe(false)
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

  it("keeps unique-answer-image questions on the verified unique-choice contract", () => {
    const item = question(17)
    item.choices = [
      { id: 61, answer: '<img src="/r/question/file/61" alt="First image">', position: 1 },
      { id: 62, answer: '<img src="/r/question/file/62" alt="Second image">', position: 2 },
    ]
    const state = createExerciseAnswerState(item)

    expect(answerKind(item)).toBe("radio")
    expect(isSupportedExerciseQuestion(item)).toBe(true)

    state.choice = 62
    expect(buildExerciseAnswerPayload(item, state)).toEqual({ choice: 62 })

    const restored = createExerciseAnswerState(item)
    applySavedExerciseAnswer(item, [{ answer: "62", position: 0 }], restored)
    expect(restored.choice).toBe(62)
  })

  it("matches the LMS Vue single-select contract for dropdown question types 28 and 29", () => {
    for (const type of [28, 29]) {
      const item = question(type)
      item.dropdown = {
        options: [
          { id: 71, answer: "First", position: 1 },
          { id: 72, answer: "Second", position: 2 },
        ],
      }
      const state = createExerciseAnswerState(item)

      expect(answerKind(item)).toBe("dropdown")
      expect(isSupportedExerciseQuestion(item)).toBe(true)

      state.dropdown = 72
      expect(isExerciseAnswerProvided(item, state)).toBe(true)
      expect(buildExerciseAnswerPayload(item, state)).toEqual({ dropdown: 72 })

      const restored = createExerciseAnswerState(item)
      applySavedExerciseAnswer(item, [{ answer: "72", position: 0 }], restored)
      expect(restored.dropdown).toBe(72)
    }
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

  it("restores saved files for oral and upload answers", () => {
    for (const type of [13, 23]) {
      const item = question(type)
      const state = createExerciseAnswerState(item)

      expect(isSupportedExerciseQuestion(item)).toBe(true)
      expect(isExerciseAnswerProvided(item, state)).toBe(false)

      applySavedExerciseAnswer(
        item,
        [
          {
            answer: "",
            position: null,
            files: [
              {
                id: 44,
                name: type === 13 ? "answer.wav" : "report.pdf",
                size: 1024,
                mimeType: type === 13 ? "audio/wav" : "application/pdf",
                url: "/r/attempt-file/44",
              },
            ],
          },
        ],
        state,
      )

      expect(state.uploadedFiles).toHaveLength(1)
      expect(state.uploadedFiles?.[0]?.id).toBe(44)
      expect(isExerciseAnswerProvided(item, state)).toBe(true)
      expect(buildExerciseAnswerPayload(item, state)).toEqual({})
    }
  })

  it("supports prepared Office answers while image questions stay supported", () => {
    const office = question(30)
    office.onlyoffice = {
      templateName: "worksheet.docx",
      templateUrl: "/api/exercise/template/30",
      editorUrl: "/plugin/Onlyoffice/editor.php",
      manualCorrection: true,
    }
    const officeState = createExerciseAnswerState(office)

    expect(answerKind(office)).toBe("office")
    expect(isSupportedExerciseQuestion(office)).toBe(true)
    expect(isExerciseAnswerProvided(office, officeState)).toBe(false)
    expect(buildExerciseAnswerPayload(office, officeState)).toEqual({ onlyoffice: true })

    applySavedExerciseAnswer(
      office,
      [
        {
          answer: "onlyoffice:77",
          position: 0,
          files: [
            {
              id: 77,
              name: "worksheet.docx",
              size: 8192,
              mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              url: "/api/exercise/runtime/7/attempt/9/file/77/download?cid=3",
            },
          ],
        },
      ],
      officeState,
    )

    expect(officeState.uploadedFiles?.[0]?.id).toBe(77)
    expect(isExerciseAnswerProvided(office, officeState)).toBe(true)
    expect(hasUnsupportedExerciseQuestions([office])).toBe(false)

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
