import type {
  ExerciseAnswerResponse,
  ExerciseAttempt,
  ExerciseChoice,
  ExerciseFinishResponse,
  ExerciseList,
  ExerciseListItem,
  ExerciseQuestion,
  ExerciseResult,
  ExerciseRuntime,
  SavedAnswerRow,
} from "@/domain/exercises/types"

export class ExerciseContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExerciseContractError"
  }
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExerciseContractError(message)
  }

  return value as Record<string, unknown>
}

function optionalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function positiveInteger(value: unknown, message: string): number {
  const parsed = numberValue(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ExerciseContractError(message)
  return parsed
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function booleanValue(value: unknown): boolean {
  return value === true
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : []
}

function normalizeChoice(value: unknown): ExerciseChoice | null {
  const item = optionalRecord(value)
  if (!item || !Number.isInteger(item.id) || numberValue(item.id) <= 0) return null

  return {
    id: numberValue(item.id),
    answer: stringValue(item.answer),
    position: numberValue(item.position),
  }
}

function normalizeChoices(value: unknown): ExerciseChoice[] {
  return Array.isArray(value)
    ? value.map(normalizeChoice).filter((item): item is ExerciseChoice => item !== null)
    : []
}

function normalizeSavedAnswers(value: unknown): Record<string, SavedAnswerRow[]> {
  const source = optionalRecord(value)
  if (!source) return {}

  return Object.fromEntries(
    Object.entries(source).map(([questionId, rows]) => [
      questionId,
      Array.isArray(rows)
        ? rows
            .map((row) => optionalRecord(row))
            .filter((row): row is Record<string, unknown> => row !== null)
            .map((row) => ({
              answer: stringValue(row.answer),
              position: nullableNumber(row.position),
            }))
        : [],
    ]),
  )
}

function normalizeAttempt(value: unknown): ExerciseAttempt | null {
  const item = optionalRecord(value)
  if (!item) return null

  return {
    attemptId: positiveInteger(item.attemptId, "The exercise attempt id is invalid."),
    attemptNumber: nullableNumber(item.attemptNumber),
    status: stringValue(item.status),
    success: booleanValue(item.success),
    message: stringValue(item.message),
    currentQuestionIndex: Math.max(0, numberValue(item.currentQuestionIndex)),
    currentQuestionId: nullableNumber(item.currentQuestionId),
    questionIds: numberArray(item.questionIds),
    totalQuestions: Math.max(0, numberValue(item.totalQuestions)),
    startedAt: nullableString(item.startedAt),
    expiredAt: nullableString(item.expiredAt),
    remainingSeconds: nullableNumber(item.remainingSeconds),
    canNavigatePrevious: booleanValue(item.canNavigatePrevious),
    canNavigateNext: booleanValue(item.canNavigateNext),
    canFinish: booleanValue(item.canFinish),
    usesLegacyRuntime: booleanValue(item.usesLegacyRuntime),
    savedAnswers: normalizeSavedAnswers(item.savedAnswers),
    reviewQuestionIds: numberArray(item.reviewQuestionIds),
  }
}

function normalizeQuestion(value: unknown): ExerciseQuestion | null {
  const item = optionalRecord(value)
  if (!item || !Number.isInteger(item.id) || numberValue(item.id) <= 0) return null

  const fillBlanks = optionalRecord(item.fillBlanks)
  const matching = optionalRecord(item.matching)
  const draggable = optionalRecord(item.draggable)
  const dropdown = optionalRecord(item.dropdown)
  const calculated = optionalRecord(item.calculated)

  return {
    id: numberValue(item.id),
    title: stringValue(item.title),
    description: stringValue(item.description),
    type: numberValue(item.type),
    typeLabel: stringValue(item.typeLabel),
    position: numberValue(item.position),
    mandatory: booleanValue(item.mandatory),
    duration: nullableNumber(item.duration),
    choices: normalizeChoices(item.choices),
    trueFalseOptions: Array.isArray(item.trueFalseOptions)
      ? item.trueFalseOptions
          .map((option) => optionalRecord(option))
          .filter((option): option is Record<string, unknown> => option !== null)
          .map((option) => ({
            id: numberValue(option.id),
            title: stringValue(option.title),
            position: numberValue(option.position),
          }))
      : [],
    fillBlanks: fillBlanks
      ? {
          segments: Array.isArray(fillBlanks.segments)
            ? fillBlanks.segments
                .map((segment) => optionalRecord(segment))
                .filter((segment): segment is Record<string, unknown> => segment !== null)
                .map((segment) => ({
                  type: segment.type === "blank" ? ("blank" as const) : ("text" as const),
                  text: stringValue(segment.text),
                  position: nullableNumber(segment.position) ?? undefined,
                  inputSize: nullableNumber(segment.inputSize) ?? undefined,
                }))
            : [],
          separator: numberValue(fillBlanks.separator),
        }
      : null,
    matching: matching
      ? {
          prompts: normalizeChoices(matching.prompts),
          options: normalizeChoices(matching.options),
        }
      : null,
    draggable: draggable ? { items: normalizeChoices(draggable.items) } : null,
    dropdown: dropdown ? { options: normalizeChoices(dropdown.options) } : null,
    calculated: calculated
      ? {
          answerId: nullableNumber(calculated.answerId),
          text: stringValue(calculated.text),
          variations: Array.isArray(calculated.variations)
            ? calculated.variations
                .map((variation) => optionalRecord(variation))
                .filter((variation): variation is Record<string, unknown> => variation !== null)
                .map((variation) => ({
                  id: numberValue(variation.id),
                  text: stringValue(variation.text),
                }))
            : [],
        }
      : null,
    isContent: booleanValue(item.isContent),
  }
}

function normalizeListItem(value: unknown): ExerciseListItem | null {
  const item = optionalRecord(value)
  if (!item || !Number.isInteger(item.iid) || numberValue(item.iid) <= 0) return null
  const latest = optionalRecord(item.latestAttempt)

  return {
    id: numberValue(item.iid),
    title: stringValue(item.title),
    description: stringValue(item.description),
    availabilityStatus: stringValue(item.availabilityStatus),
    startTime: nullableString(item.startTime),
    endTime: nullableString(item.endTime),
    duration: nullableNumber(item.duration),
    maxAttempt: numberValue(item.maxAttempt),
    passPercentage: numberValue(item.passPercentage),
    questionCount: numberValue(item.questionCount),
    attemptCount: numberValue(item.attemptCount),
    latestAttempt: latest
      ? {
          id: numberValue(latest.id),
          score: numberValue(latest.score),
          maxScore: numberValue(latest.maxScore),
          percentage: numberValue(latest.percentage),
          date: stringValue(latest.date),
          status: stringValue(latest.status),
        }
      : null,
    isLinkedToLearningPath: booleanValue(item.isLinkedToLearningPath),
    isReadOnlyFromLearningPath: booleanValue(item.isReadOnlyFromLearningPath),
    learningPathReadOnlyMessage: stringValue(item.learningPathReadOnlyMessage),
    canOpen: booleanValue(item.canOpen),
  }
}

export function normalizeExerciseList(value: unknown): ExerciseList {
  const source = record(value, "The exercise list response is invalid.")
  const items = Array.isArray(source.items)
    ? source.items.map(normalizeListItem).filter((item): item is ExerciseListItem => item !== null)
    : []

  return { items, totalItems: numberValue(source.totalItems, items.length) }
}

export function normalizeExerciseRuntime(value: unknown): ExerciseRuntime {
  const source = record(value, "The exercise runtime response is invalid.")
  const attempt = normalizeAttempt(source.attempt)
  const canSubmit = booleanValue(source.canSubmit)
  if (attempt && !Object.prototype.hasOwnProperty.call(record(source.attempt, ""), "canFinish")) {
    attempt.canFinish = canSubmit
  }

  return {
    exerciseId: positiveInteger(source.exerciseId, "The exercise id is invalid."),
    title: stringValue(source.title),
    description: stringValue(source.description),
    settings: optionalRecord(source.settings) ?? {},
    questions: Array.isArray(source.questions)
      ? source.questions
          .map(normalizeQuestion)
          .filter((question): question is ExerciseQuestion => question !== null)
      : [],
    questionCount: numberValue(source.questionCount),
    totalScore: numberValue(source.totalScore),
    canManage: booleanValue(source.canManage),
    legacyUrls: Object.fromEntries(
      Object.entries(optionalRecord(source.legacyUrls) ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    attempt,
    canStartAttempt: booleanValue(source.canStartAttempt),
    canSubmit,
    usesLegacySubmit: booleanValue(source.usesLegacySubmit),
  }
}

export function normalizeExerciseAttempt(value: unknown): ExerciseAttempt {
  const attempt = normalizeAttempt(value)
  if (!attempt) throw new ExerciseContractError("The exercise attempt response is invalid.")
  return attempt
}

export function normalizeExerciseAnswerResponse(value: unknown): ExerciseAnswerResponse {
  const source = record(value, "The exercise answer response is invalid.")

  return {
    success: booleanValue(source.success),
    message: stringValue(source.message),
    savedAnswer: normalizeSavedAnswers({ answer: source.savedAnswer }).answer ?? [],
    answeredQuestionIds: numberArray(source.answeredQuestionIds),
    reviewQuestionIds: numberArray(source.reviewQuestionIds),
    answeredCount: numberValue(source.answeredCount),
    canFinish: booleanValue(source.canFinish),
  }
}

export function normalizeExerciseFinishResponse(value: unknown): ExerciseFinishResponse {
  const source = record(value, "The exercise finish response is invalid.")

  return {
    success: booleanValue(source.success),
    message: stringValue(source.message),
    status: stringValue(source.status),
    score: numberValue(source.score),
    maxScore: numberValue(source.maxScore),
    completedAt: nullableString(source.completedAt),
  }
}

export function normalizeExerciseResult(value: unknown): ExerciseResult {
  const source = record(value, "The exercise result response is invalid.")

  return {
    exerciseId: positiveInteger(source.exerciseId, "The exercise id is invalid."),
    attemptId: positiveInteger(source.attemptId, "The exercise attempt id is invalid."),
    title: stringValue(source.title),
    description: stringValue(source.description),
    attempt: optionalRecord(source.attempt) ?? {},
    questions: Array.isArray(source.questions)
      ? source.questions
          .map((question) => optionalRecord(question))
          .filter((question): question is Record<string, unknown> => question !== null)
      : [],
  }
}
