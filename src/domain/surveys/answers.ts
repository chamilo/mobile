import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  SurveyAnswerDraft,
  SurveyDetail,
  SurveyQuestion,
  SurveySubmissionPayload,
  SurveyValidationResult,
} from "@/domain/surveys/types"

function nonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(nonEmpty)

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(nonEmpty)
  }

  if (typeof value === "number") return value > 0
  if (typeof value === "string") return value.trim() !== ""

  return false
}

function selectedOptionIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((candidate) => Number.isInteger(candidate) && candidate > 0)
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .map(Number)
      .filter((candidate) => Number.isInteger(candidate) && candidate > 0)
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? [parsed] : []
}

export function createSurveyDraft(detail: SurveyDetail): SurveyAnswerDraft {
  const answers: Record<string, unknown> = {}
  const otherAnswers: Record<string, string> = {}

  for (const [key, value] of Object.entries(detail.answers)) {
    if (key.startsWith("other_")) {
      const questionId = key.slice("other_".length)
      otherAnswers[questionId] = typeof value === "string" ? value : String(value ?? "")
      continue
    }

    answers[key] = structuredClone(value)
  }

  return {
    version: 1,
    surveyId: detail.id,
    answers,
    otherAnswers,
    profileValues: Object.fromEntries(
      detail.profileFields.map((field) => [field.key, structuredClone(field.value)]),
    ),
    savedAt: new Date().toISOString(),
    finalizedAt: null,
  }
}

export function mergeSurveyDraft(
  detail: SurveyDetail,
  stored: SurveyAnswerDraft | null,
): SurveyAnswerDraft {
  const initial = createSurveyDraft(detail)

  if (!stored || stored.version !== 1 || stored.surveyId !== detail.id) return initial

  return {
    ...initial,
    answers: {
      ...initial.answers,
      ...structuredClone(stored.answers),
    },
    otherAnswers: {
      ...initial.otherAnswers,
      ...structuredClone(stored.otherAnswers),
    },
    profileValues: {
      ...initial.profileValues,
      ...structuredClone(stored.profileValues),
    },
    savedAt: stored.savedAt,
    finalizedAt: stored.finalizedAt,
  }
}

export function isSurveyQuestionVisible(
  question: SurveyQuestion,
  answers: Readonly<Record<string, unknown>>,
): boolean {
  if (!question.parentQuestionId || !question.parentOptionId) return true

  return selectedOptionIds(answers[String(question.parentQuestionId)]).includes(
    question.parentOptionId,
  )
}

export function validateSurveyDraft(
  detail: SurveyDetail,
  draft: SurveyAnswerDraft,
): SurveyValidationResult {
  const questionErrors: Record<string, string> = {}
  const profileErrors: Record<string, string> = {}

  for (const page of detail.pages) {
    for (const question of page.questions) {
      if (!question.supported || !question.required) continue
      if (!isSurveyQuestionVisible(question, draft.answers)) continue

      const questionId = String(question.id)
      const hasOther = Boolean(draft.otherAnswers[questionId]?.trim())
      if (!nonEmpty(draft.answers[questionId]) && !hasOther) {
        questionErrors[questionId] = "required"
      }
    }
  }

  for (const field of detail.profileFields) {
    if (!field.required || field.readOnly) continue
    if (!nonEmpty(draft.profileValues[field.key])) profileErrors[field.key] = "required"
  }

  return {
    valid: Object.keys(questionErrors).length === 0 && Object.keys(profileErrors).length === 0,
    questionErrors,
    profileErrors,
  }
}

export function buildSurveySubmissionPayload(
  detail: SurveyDetail,
  draft: SurveyAnswerDraft,
): SurveySubmissionPayload {
  const visibleQuestionIds = new Set(
    detail.pages
      .flatMap((page) => page.questions)
      .filter((question) => question.supported && isSurveyQuestionVisible(question, draft.answers))
      .map((question) => String(question.id)),
  )

  return {
    csrfToken: detail.csrfToken,
    answers: Object.fromEntries(
      Object.entries(draft.answers).filter(([questionId]) => visibleQuestionIds.has(questionId)),
    ),
    otherAnswers: Object.fromEntries(
      Object.entries(draft.otherAnswers).filter(([questionId]) =>
        visibleQuestionIds.has(questionId),
      ),
    ),
    profileValues: Object.fromEntries(
      detail.profileFields
        .filter((field) => !field.readOnly)
        .map((field) => [field.key, structuredClone(draft.profileValues[field.key] ?? "")]),
    ),
  }
}

export function buildSurveyDraftSnapshotKey(
  context: CourseNavigationContext,
  surveyId: number,
  invitationLpItemId: number,
): string {
  return [
    "survey-draft",
    context.courseId,
    context.sessionId ?? 0,
    surveyId,
    invitationLpItemId,
  ].join(":")
}
