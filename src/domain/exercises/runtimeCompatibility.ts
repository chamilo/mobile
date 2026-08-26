import {
  OFFICE_DOCUMENT_TYPE,
  ORAL_EXPRESSION_TYPE,
  UPLOAD_ANSWER_TYPE,
} from "@/domain/exercises/fileAnswers"
import {
  exerciseRuntimePagesRequireCampus,
  type ExerciseRuntimePage,
} from "@/domain/exercises/runtimePages"
import type { ExerciseQuestion } from "@/domain/exercises/types"

export type ExerciseRuntimeCompatibilityReason =
  | "timed_questions"
  | "blocked_categories"
  | "structural_pages"
  | "prevent_backwards_review"

function numberSetting(settings: Record<string, unknown>, key: string): number {
  const value = settings[key]
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0) || 0
}

export function exerciseRuntimeCompatibilityReason(
  settings: Record<string, unknown>,
  runtimePages: ExerciseRuntimePage[] = [],
  campusBaseUrl: string | null = null,
  questions: ExerciseQuestion[] = [],
): ExerciseRuntimeCompatibilityReason | null {
  if (settings.allowTimePerQuestion === true && settings.hasTimedQuestions === true) {
    const feedbackType = numberSetting(settings, "feedbackType")
    const hasUnsupportedTimedFileQuestion = questions.some(
      (question) =>
        Number(question.duration ?? 0) > 0 &&
        [ORAL_EXPRESSION_TYPE, UPLOAD_ANSWER_TYPE, OFFICE_DOCUMENT_TYPE].includes(question.type),
    )

    if (
      settings.effectiveOneQuestionPerPage !== true ||
      [1, 3, 4].includes(feedbackType) ||
      numberSetting(settings, "reviewAnswers") > 0 ||
      settings.checkAllAnswersBeforeEndTest === true ||
      hasUnsupportedTimedFileQuestion
    ) {
      return "timed_questions"
    }
  }

  if (settings.blockCategoryQuestions === true) return "blocked_categories"

  if (settings.usesStructuralPages === true) {
    if (
      runtimePages.length === 0 ||
      exerciseRuntimePagesRequireCampus(runtimePages, campusBaseUrl)
    ) {
      return "structural_pages"
    }
  }

  if (
    settings.preventBackwards === true &&
    (numberSetting(settings, "reviewAnswers") > 0 ||
      settings.checkAllAnswersBeforeEndTest === true)
  ) {
    return "prevent_backwards_review"
  }

  return null
}

export function isExercisePreviousNavigationAllowed(
  settings: Record<string, unknown>,
): boolean {
  return (
    settings.preventBackwards !== true &&
    settings.blockCategoryQuestions !== true &&
    settings.showPreviousButton !== false
  )
}

export function isExerciseQuestionTitleVisible(settings: Record<string, unknown>): boolean {
  return settings.hideQuestionTitle !== true
}
