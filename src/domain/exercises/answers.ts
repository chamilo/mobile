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
const ANNOTATION_TYPES = [20]
const FILE_TYPES = [13, 23]
const OFFICE_TYPES = [30]
const UNSUPPORTED_TYPES: number[] = []
const STRUCTURAL_TYPES = [15, 31]

export function isStructuralExerciseQuestion(question: ExerciseQuestion): boolean {
  return question.isContent || STRUCTURAL_TYPES.includes(question.type)
}

export function isSupportedExerciseQuestion(question: ExerciseQuestion): boolean {
  if (HOTSPOT_TYPES.includes(question.type)) return Boolean(question.hotspot?.imageUrl)
  if (ANNOTATION_TYPES.includes(question.type)) return Boolean(question.annotation?.imageUrl)
  if (FILE_TYPES.includes(question.type) || OFFICE_TYPES.includes(question.type)) return true

  return (
    RADIO_TYPES.includes(question.type) ||
    CHECKBOX_TYPES.includes(question.type) ||
    TRUE_FALSE_TYPES.includes(question.type) ||
    FILL_BLANK_TYPES.includes(question.type) ||
    MATCHING_TYPES.includes(question.type) ||
    question.type === 18 ||
    DROPDOWN_TYPES.includes(question.type) ||
    question.type === 16 ||
    question.type === 5
  )
}

export function hasUnsupportedExerciseQuestions(questions: ExerciseQuestion[]): boolean {
  return questions.some(
    (question) =>
      !isStructuralExerciseQuestion(question) &&
      (!isSupportedExerciseQuestion(question) || UNSUPPORTED_TYPES.includes(question.type)),
  )
}

export function isExerciseAnswerProvided(
  question: ExerciseQuestion,
  state: ExerciseAnswerState,
): boolean {
  if (RADIO_TYPES.includes(question.type)) return state.choice !== null
  if (CHECKBOX_TYPES.includes(question.type)) return state.choices.length > 0
  if (TRUE_FALSE_TYPES.includes(question.type)) {
    return (
      question.choices.length > 0 &&
      question.choices.every((choice) => Number(state.trueFalse[choice.id] ?? 0) > 0)
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
  if (DROPDOWN_TYPES.includes(question.type)) return state.dropdown !== null
  if (HOTSPOT_TYPES.includes(question.type)) {
    const points = state.hotspotPoints ?? []
    if (question.type === 8) return points.length >= 3

    return points.length >= Math.max(1, question.hotspot?.maxClicks ?? 1)
  }
  if (ANNOTATION_TYPES.includes(question.type)) {
    const hasPath = (state.annotationPaths ?? []).some((path) => path.points.length >= 2)
    const hasText = (state.annotationTexts ?? []).some((item) => item.text.trim().length > 0)

    return hasPath || hasText
  }
  if (FILE_TYPES.includes(question.type) || OFFICE_TYPES.includes(question.type)) {
    return (state.uploadedFiles?.length ?? 0) > 0
  }
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
    hotspotPoints: [],
    annotationPaths: [],
    annotationTexts: [],
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
  if (DROPDOWN_TYPES.includes(question.type)) return { dropdown: state.dropdown }
  if (HOTSPOT_TYPES.includes(question.type)) return { points: state.hotspotPoints ?? [] }
  if (ANNOTATION_TYPES.includes(question.type)) {
    return {
      paths: state.annotationPaths ?? [],
      texts: state.annotationTexts ?? [],
    }
  }
  if (question.type === 16) {
    return { calculated: state.calculated, answerId: state.calculatedAnswerId }
  }
  if (question.type === 5) return { text: state.text }
  if (OFFICE_TYPES.includes(question.type)) return { onlyoffice: true }

  return {}
}

export function applySavedExerciseAnswer(
  question: ExerciseQuestion,
  rows: SavedAnswerRow[],
  state: ExerciseAnswerState,
): void {
  state.uploadedFiles = rows.flatMap((row) => row.files ?? [])
  if (FILE_TYPES.includes(question.type) || OFFICE_TYPES.includes(question.type)) return
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
  if (DROPDOWN_TYPES.includes(question.type)) {
    state.dropdown = Number(rows[0]?.answer || 0) || null
    return
  }
  if (HOTSPOT_TYPES.includes(question.type)) {
    const points = String(rows[0]?.answer ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        let answerId = 0
        let coordinate = item
        if (item.includes(":")) {
          const parts = item.split(":", 2)
          answerId = Number(parts[0] ?? 0)
          coordinate = parts[1] ?? ""
        }
        const [rawX, rawY] = coordinate.split(";", 2)
        const x = Number(rawX)
        const y = Number(rawY)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null

        return {
          x: Math.max(0, Math.round(x)),
          y: Math.max(0, Math.round(y)),
          ...(answerId > 0 ? { answerId } : {}),
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== null)

    state.hotspotPoints = points
    return
  }
  if (ANNOTATION_TYPES.includes(question.type)) {
    const paths: ExerciseAnswerState["annotationPaths"] = []
    const texts: ExerciseAnswerState["annotationTexts"] = []

    for (const item of String(rows[0]?.answer ?? "").split("|")) {
      const parts = item.split(")(")
      const type = parts.shift()?.trim()
      if (type === "P") {
        const points = parts
          .map((coordinate) => {
            const [rawX, rawY] = coordinate.split(";", 2)
            const x = Number(rawX)
            const y = Number(rawY)
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null
            return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
          })
          .filter((point): point is NonNullable<typeof point> => point !== null)
        if (points.length >= 2) paths.push({ points })
      } else if (type === "T") {
        const text = String(parts[0] ?? "").trim()
        const [rawX, rawY] = String(parts[1] ?? "").split(";", 2)
        const x = Number(rawX)
        const y = Number(rawY)
        if (text && Number.isFinite(x) && Number.isFinite(y)) {
          texts.push({
            text,
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(y)),
          })
        }
      }
    }

    state.annotationPaths = paths
    state.annotationTexts = texts
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
  | "checkbox"
  | "true-false"
  | "fill-blanks"
  | "matching"
  | "ordering"
  | "dropdown"
  | "calculated"
  | "hotspot"
  | "annotation"
  | "oral"
  | "upload"
  | "office"
  | "text"
  | "unsupported" {
  if (RADIO_TYPES.includes(question.type)) return "radio"
  if (CHECKBOX_TYPES.includes(question.type)) return "checkbox"
  if (TRUE_FALSE_TYPES.includes(question.type)) return "true-false"
  if (FILL_BLANK_TYPES.includes(question.type)) return "fill-blanks"
  if (MATCHING_TYPES.includes(question.type)) return "matching"
  if (question.type === 18) return "ordering"
  if (DROPDOWN_TYPES.includes(question.type)) return "dropdown"
  if (HOTSPOT_TYPES.includes(question.type)) return "hotspot"
  if (ANNOTATION_TYPES.includes(question.type)) return "annotation"
  if (question.type === 13) return "oral"
  if (question.type === 23) return "upload"
  if (OFFICE_TYPES.includes(question.type)) return "office"
  if (question.type === 16) return "calculated"
  if (question.type === 5) return "text"
  return "unsupported"
}
