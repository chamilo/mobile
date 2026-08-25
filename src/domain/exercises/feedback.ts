import type {
  ExerciseAnswerFeedback,
  ExerciseFeedbackAfterAction,
} from "@/domain/exercises/types"

const IMMEDIATE_FEEDBACK_TYPES = new Set([1, 3, 4])

export function isImmediateExerciseFeedbackType(value: unknown): boolean {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0)
  return IMMEDIATE_FEEDBACK_TYPES.has(parsed)
}

export function withExerciseFeedbackFallbackAction(
  feedback: ExerciseAnswerFeedback,
  fallbackAction: string,
): ExerciseAnswerFeedback {
  if (feedback.afterAction !== "none") return feedback

  const normalized = normalizeExerciseFeedbackAfterAction(fallbackAction)
  return normalized === "none" ? feedback : { ...feedback, afterAction: normalized }
}

export function normalizeExerciseFeedbackAfterAction(value: unknown): ExerciseFeedbackAfterAction {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "next":
    case "previous":
    case "finish":
    case "repeat":
    case "question":
    case "url":
      return String(value).trim().toLowerCase() as ExerciseFeedbackAfterAction
    default:
      return "none"
  }
}
