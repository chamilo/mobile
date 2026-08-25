import {
  normalizeExerciseAnnotationPaths,
  normalizeExerciseAnnotationTexts,
  parseSavedExerciseAnnotation,
} from "@/domain/exercises/annotation"
import {
  isExerciseFileAnswerType,
  OFFICE_DOCUMENT_TYPE,
  ORAL_EXPRESSION_TYPE,
  UPLOAD_ANSWER_TYPE,
} from "@/domain/exercises/fileAnswers"
import { parseSavedExerciseHotspotPoints } from "@/domain/exercises/hotspot"
import type {
  ExerciseAnswerState,
  ExerciseQuestion,
  SavedAnswerRow,
} from "@/domain/exercises/types"

const RADIO_TYPES = [1, 10, 17, 21]
const CHECKBOX_TYPES = [2, 9, 14]
const TRUE_FALSE_TYPES = [11, 12, 22]
const FILL_BLANK_TYPES = [3, 27]
const MATCHING_TYPES = [4, 19, 24, 25]
const DROPDOWN_TYPES = [28, 29]
const HOTSPOT_TYPES = [6, 8, 26]
const ANNOTATION_TYPE = 20
const STRUCTURAL_TYPES = [15, 31]

export function isStructuralExerciseQuestion(question: ExerciseQuestion): boolean {
  return question.isContent || STRUCTURAL_TYPES.includes(question.type)
}

export function isSupportedExerciseQuestion(question: ExerciseQuestion): boolean {
  return (
    RADIO_TYPES.includes(question.type) ||
    CHECKBOX_TYPES.includes(question.type) ||
    TRUE_FALSE_TYPES.includes(question.type) ||
    FILL_BLANK_TYPES.includes(question.type) ||
    MATCHING_TYPES.includes(question.type) ||
    question.type === 18 ||
    (HOTSPOT_TYPES.includes(question.type) && Boolean(question.hotspot?.imageUrl)) ||
    (question.type === ANNOTATION_TYPE && Boolean(question.annotation?.imageUrl)) ||
    (isExerciseFileAnswerType(question.type) &&
      (question.type !== OFFICE_DOCUMENT_TYPE || Boolean(question.onlyoffice?.templateUrl))) ||
    DROPDOWN_TYPES.includes(question.type) ||
    question.type === 16 ||
    question.type === 5
  )
}

export function hasUnsupportedExerciseQuestions(questions: ExerciseQuestion[]): boolean {
  return questions.some(
    (question) =>
      !isStructuralExerciseQuestion(question) &&
      !isSupportedExerciseQuestion(question),
  )
}

export function isExerciseAnswerProvided(
  question: ExerciseQuestion,
  state: ExerciseAnswerState,
): boolean {
  if (RADIO_TYPES.includes(question.type)) return state.choice !== null
  if (CHECKBOX_TYPES.includes(question.type)) return state.choices.length > 0
  if (TRUE_FALSE_TYPES.includes(question.type)) {
    const hasEveryAnswer =
      question.choices.length > 0 &&
      question.choices.every((choice) => Number(state.trueFalse[choice.id] ?? 0) > 0)

    if (!hasEveryAnswer) return false
    if (question.type !== 22) return true

    return question.choices.every(
      (choice) => Number(state.degreeCertainty[choice.id] ?? 0) > 0,
    )
  }
  if (FILL_BLANK_TYPES.includes(question.type)) {
    const positions =
      question.fillBlanks?.segments
        .filter((segment) => segment.type === "blank")
        .map((segment) => segment.position ?? 0)
        .filter((position) => position > 0) ?? []

    return (
      positions.length > 0 &&
      positions.every((position) => String(state.blanks[position] ?? "").trim().length > 0)
    )
  }
  if (MATCHING_TYPES.includes(question.type)) {
    const prompts = question.matching?.prompts ?? []

    return (
      prompts.length > 0 && prompts.every((prompt) => Number(state.matching[prompt.id] ?? 0) > 0)
    )
  }
  if (question.type === 18) {
    return state.order.length > 0 && state.order.length === (question.draggable?.items.length ?? 0)
  }
  if (question.type === ANNOTATION_TYPE) {
    return (
      normalizeExerciseAnnotationPaths(state.annotationPaths ?? []).length > 0 ||
      normalizeExerciseAnnotationTexts(state.annotationTexts ?? []).length > 0
    )
  }
  if (HOTSPOT_TYPES.includes(question.type)) {
    const points = state.hotspotPoints ?? []
    if (question.hotspot?.delineation) return points.length >= 3

    return points.length >= Math.max(1, question.hotspot?.maxClicks ?? 1)
  }
  if (isExerciseFileAnswerType(question.type)) return (state.uploadedFiles?.length ?? 0) > 0
  if (DROPDOWN_TYPES.includes(question.type)) return state.dropdown !== null
  if (question.type === 16) return state.calculated.trim().length > 0
  if (question.type === 5) return state.text.trim().length > 0

  return false
}

export function createExerciseAnswerState(question: ExerciseQuestion): ExerciseAnswerState {
  return {
    choice: null,
    choices: [],
    trueFalse: {},
    degreeCertainty: {},
    blanks: {},
    matching: {},
    order: question.draggable?.items.map((item) => item.id) ?? [],
    dropdown: null,
    calculated: "",
    calculatedAnswerId:
      question.calculated?.answerId ?? question.calculated?.variations[0]?.id ?? null,
    text: "",
    annotationPaths: [],
    annotationTexts: [],
    hotspotPoints: [],
    uploadedFiles: [],
    reviewLater: false,
  }
}

export function buildExerciseAnswerPayload(
  question: ExerciseQuestion,
  state: ExerciseAnswerState,
): Record<string, unknown> {
  if (RADIO_TYPES.includes(question.type)) return { choice: state.choice }
  if (CHECKBOX_TYPES.includes(question.type)) return { choices: state.choices }
  if (TRUE_FALSE_TYPES.includes(question.type)) {
    return {
      trueFalse: state.trueFalse,
      degreeCertainty: state.degreeCertainty,
    }
  }
  if (FILL_BLANK_TYPES.includes(question.type)) return { blanks: state.blanks }
  if (MATCHING_TYPES.includes(question.type)) return { matching: state.matching }
  if (question.type === 18) return { order: state.order }
  if (question.type === ANNOTATION_TYPE) {
    return {
      paths: normalizeExerciseAnnotationPaths(state.annotationPaths ?? []),
      texts: normalizeExerciseAnnotationTexts(state.annotationTexts ?? []),
    }
  }
  if (HOTSPOT_TYPES.includes(question.type)) {
    return {
      points: (state.hotspotPoints ?? []).map((point) => ({
        x: point.x,
        y: point.y,
        ...(point.answerId ? { answerId: point.answerId } : {}),
      })),
    }
  }
  if (isExerciseFileAnswerType(question.type)) return {}
  if (DROPDOWN_TYPES.includes(question.type)) return { dropdown: state.dropdown }
  if (question.type === 16) {
    return { calculated: state.calculated, answerId: state.calculatedAnswerId }
  }
  if (question.type === 5) return { text: state.text }

  return {}
}

export function applySavedExerciseAnswer(
  question: ExerciseQuestion,
  rows: SavedAnswerRow[],
  state: ExerciseAnswerState,
): void {
  if (RADIO_TYPES.includes(question.type)) {
    state.choice = Number(rows[0]?.answer || 0) || null
    return
  }
  if (CHECKBOX_TYPES.includes(question.type)) {
    state.choices = rows.map((row) => Number(row.answer || 0)).filter((id) => id > 0)
    return
  }
  if (TRUE_FALSE_TYPES.includes(question.type)) {
    for (const row of rows) {
      const parts = row.answer.split(":").map(Number)
      const answerId = parts[0] ?? 0
      const optionValue = parts[1] ?? 0
      const certaintyValue = parts[2] ?? 0
      if (answerId > 0 && optionValue > 0) state.trueFalse[answerId] = optionValue
      if (answerId > 0 && certaintyValue > 0) state.degreeCertainty[answerId] = certaintyValue
    }
    return
  }
  if (FILL_BLANK_TYPES.includes(question.type)) {
    const separators = [
      ["[", "]"],
      ["{", "}"],
      ["(", ")"],
      ["*", "*"],
      ["#", "#"],
      ["%", "%"],
      ["$", "$"],
    ]
    const [start = "[", end = "]"] =
      separators[question.fillBlanks?.separator ?? 0] ?? separators[0] ?? []
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = new RegExp(`${escape(start)}(.*?)${escape(end)}`, "g")
    const savedValue = String(rows[0]?.answer ?? "").split("::")[0] ?? ""
    const matches = [...savedValue.matchAll(pattern)]
    for (let index = 0; index < matches.length; index += 3) {
      state.blanks[Math.floor(index / 3) + 1] = matches[index + 1]?.[1] ?? ""
    }
    return
  }
  if (MATCHING_TYPES.includes(question.type)) {
    rows.forEach((row) => {
      const promptId = Number(row.position || 0)
      const optionId = Number(row.answer || 0)
      if (promptId > 0 && optionId > 0) state.matching[promptId] = optionId
    })
    return
  }
  if (question.type === 18) {
    state.order = [...rows]
      .sort((left, right) => Number(left.answer) - Number(right.answer))
      .map((row) => Number(row.position || 0))
      .filter((id) => id > 0)
    return
  }
  if (question.type === ANNOTATION_TYPE) {
    const annotation = parseSavedExerciseAnnotation(rows)
    state.annotationPaths = annotation.paths
    state.annotationTexts = annotation.texts
    return
  }
  if (HOTSPOT_TYPES.includes(question.type)) {
    state.hotspotPoints = parseSavedExerciseHotspotPoints(rows)
    return
  }
  if (isExerciseFileAnswerType(question.type)) {
    const files = rows.flatMap((row) => row.files ?? [])
    const unique = new Map(files.map((file) => [file.id, file]))
    state.uploadedFiles = [...unique.values()]
    return
  }
  if (DROPDOWN_TYPES.includes(question.type)) {
    state.dropdown = Number(rows[0]?.answer || 0) || null
    return
  }
  if (question.type === 16) {
    const [answerId, ...value] = String(rows[0]?.answer || "").split(":")
    state.calculatedAnswerId = Number(answerId) || state.calculatedAnswerId
    state.calculated = value.join(":")
    return
  }
  if (question.type === 5) state.text = rows[0]?.answer ?? ""
}

export function answerKind(
  question: ExerciseQuestion,
):
  | "radio"
  | "reading"
  | "checkbox"
  | "true-false"
  | "fill-blanks"
  | "matching"
  | "ordering"
  | "annotation"
  | "hotspot"
  | "file"
  | "oral"
  | "office"
  | "dropdown"
  | "calculated"
  | "text"
  | "unsupported" {
  if (question.type === 21) return "reading"
  if (RADIO_TYPES.includes(question.type)) return "radio"
  if (CHECKBOX_TYPES.includes(question.type)) return "checkbox"
  if (TRUE_FALSE_TYPES.includes(question.type)) return "true-false"
  if (FILL_BLANK_TYPES.includes(question.type)) return "fill-blanks"
  if (MATCHING_TYPES.includes(question.type)) return "matching"
  if (question.type === 18) return "ordering"
  if (question.type === ANNOTATION_TYPE) return "annotation"
  if (HOTSPOT_TYPES.includes(question.type)) return "hotspot"
  if (question.type === ORAL_EXPRESSION_TYPE) return "oral"
  if (question.type === UPLOAD_ANSWER_TYPE) return "file"
  if (question.type === OFFICE_DOCUMENT_TYPE) return "office"
  if (DROPDOWN_TYPES.includes(question.type)) return "dropdown"
  if (question.type === 16) return "calculated"
  if (question.type === 5) return "text"
  return "unsupported"
}
