import { describe, expect, it } from "vitest"

import {
  hasUnsupportedExerciseQuestions,
  isStructuralExerciseQuestion,
} from "@/domain/exercises/answers"
import type { ExerciseQuestion } from "@/domain/exercises/types"

const ANSWERABLE_TYPES = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30,
]
const STRUCTURAL_TYPES = [15, 31]

function question(type: number): ExerciseQuestion {
  const item: ExerciseQuestion = {
    id: type,
    title: `Question ${type}`,
    description: "",
    type,
    typeLabel: `Type ${type}`,
    position: type,
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
    isContent: STRUCTURAL_TYPES.includes(type),
  }

  if ([6, 8, 26].includes(type)) {
    item.hotspot = {
      imageName: "hotspot.png",
      imageUrl: "/r/resource/1/view?cid=1",
      maxClicks: type === 8 ? 1 : 2,
      combination: type === 26,
      delineation: type === 8,
      zones: [],
    }
  }

  if (type === 20) {
    item.annotation = {
      imageName: "annotation.png",
      imageUrl: "/r/resource/2/view?cid=1",
    }
  }

  if (type === 30) {
    item.onlyoffice = {
      templateName: "template.docx",
      templateUrl: "/r/resource/3/view?cid=1",
      editorUrl: "",
      manualCorrection: true,
    }
  }

  return item
}

describe("exercise question type matrix", () => {
  it("keeps every verified answerable backend type on the native runtime", () => {
    for (const type of ANSWERABLE_TYPES) {
      expect(hasUnsupportedExerciseQuestions([question(type)]), `type ${type}`).toBe(false)
    }
  })

  it("treats media and page-break questions as structural content", () => {
    for (const type of STRUCTURAL_TYPES) {
      expect(isStructuralExerciseQuestion(question(type)), `type ${type}`).toBe(true)
    }
  })

  it("does not silently accept an unknown question type", () => {
    expect(hasUnsupportedExerciseQuestions([question(7)])).toBe(true)
    expect(hasUnsupportedExerciseQuestions([question(999)])).toBe(true)
  })
})
