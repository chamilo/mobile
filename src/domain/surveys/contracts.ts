import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  SurveyAvailabilityStatus,
  SurveyCollection,
  SurveyDetail,
  SurveyOpenMode,
  SurveyOption,
  SurveyPage,
  SurveyProfileField,
  SurveyProfileOption,
  SurveyQuestion,
  SurveySubmissionPayload,
  SurveySummary,
} from "@/domain/surveys/types"

export class SurveyContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SurveyContractError"
  }
}

type UnknownRecord = Record<string, unknown>

export interface SurveyRequestDefinition {
  path: string
  query: Record<string, string | number | boolean>
}

export interface SurveySubmitRequestDefinition extends SurveyRequestDefinition {
  body: SurveySubmissionPayload
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = numeric(value)

  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new SurveyContractError(`Invalid ${field}.`)
  }

  return parsed
}

function boolean(value: unknown): boolean {
  if (typeof value === "boolean") return value

  return value === 1 || value === "1" || value === "true"
}

function count(value: unknown): number {
  const parsed = numeric(value)
  return parsed === null ? 0 : Math.max(0, Math.trunc(parsed))
}

function nullableText(value: unknown): string | null {
  const normalized = text(value)
  return normalized || null
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function plainText(value: unknown): string {
  const html = text(value)
  if (!html) return ""

  return decodeBasicEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function availabilityStatus(value: unknown): SurveyAvailabilityStatus {
  const status = text(value)

  if (status === "open" || status === "not_started" || status === "closed") {
    return status
  }

  return "unknown"
}

function collectionItems(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value

  if (!isRecord(value)) {
    throw new SurveyContractError(`The ${label} response is invalid.`)
  }

  if (Array.isArray(value.items)) return value.items
  if (Array.isArray(value["hydra:member"])) return value["hydra:member"]
  if (Array.isArray(value.member)) return value.member

  throw new SurveyContractError(`The ${label} response has no items.`)
}

function contextQuery(context: CourseNavigationContext): Record<string, string | number> {
  return {
    cid: context.courseId,
    ...(context.sessionId ? { sid: context.sessionId } : {}),
  }
}

export function buildSurveysRequest(context: CourseNavigationContext): SurveyRequestDefinition {
  return {
    path: "/api/survey/list",
    query: contextQuery(context),
  }
}

export function buildSurveyDetailRequest(
  context: CourseNavigationContext,
  surveyId: number,
  mode: SurveyOpenMode,
  invitationLpItemId = 0,
  invitationCode = "",
  learningPathId = 0,
): SurveyRequestDefinition {
  return {
    path: `/api/survey/answer/${positiveInteger(surveyId, "survey id")}`,
    query: {
      ...contextQuery(context),
      ...(invitationLpItemId > 0 ? { lpItemId: invitationLpItemId } : {}),
      ...(learningPathId > 0 ? { lp_id: learningPathId } : {}),
      ...(invitationCode.trim() ? { invitationCode: invitationCode.trim() } : {}),
      ...(mode === "preview" ? { preview: true } : {}),
    },
  }
}

export function buildSurveySubmitRequest(
  context: CourseNavigationContext,
  surveyId: number,
  invitationLpItemId: number,
  invitationCode: string,
  body: SurveySubmissionPayload,
  learningPathId = 0,
): SurveySubmitRequestDefinition {
  return {
    path: `/api/survey/answer/${positiveInteger(surveyId, "survey id")}`,
    query: {
      ...contextQuery(context),
      ...(invitationLpItemId > 0 ? { lpItemId: invitationLpItemId } : {}),
      ...(learningPathId > 0 ? { lp_id: learningPathId } : {}),
      ...(invitationCode.trim() ? { invitationCode: invitationCode.trim() } : {}),
    },
    body: structuredClone(body),
  }
}

function openModeForSurvey(
  surveyType: number,
  anonymous: boolean,
  canPreview: boolean,
  canAnswer: boolean,
  invitationAnswered: boolean,
  invitationCode: string,
  unsupportedReason: string,
): {
  openMode: SurveyOpenMode | null
  unavailableReason: SurveySummary["unavailableReason"]
} {
  if (unsupportedReason) {
    return {
      openMode: null,
      unavailableReason: "unsupported",
    }
  }

  if (surveyType === 3) {
    return {
      openMode: null,
      unavailableReason: "meeting",
    }
  }

  if (canPreview) {
    return {
      openMode: "preview",
      unavailableReason: null,
    }
  }

  if ((!canAnswer && !invitationAnswered) || (anonymous && !invitationCode)) {
    return {
      openMode: null,
      unavailableReason: anonymous ? "anonymous" : "unsupported",
    }
  }

  return {
    openMode: "answer",
    unavailableReason: null,
  }
}

function normalizeSurveySummary(value: unknown): SurveySummary {
  if (!isRecord(value)) {
    throw new SurveyContractError("A survey is invalid.")
  }

  const surveyType = numeric(value.surveyType) ?? 0
  const anonymous = boolean(value.anonymous)
  const canPreview = boolean(value.canPreview)
  const canAnswer = boolean(value.canAnswer)
  const invitationAnswered = boolean(value.invitationAnswered)
  const invitationCode = text(value.invitationCode)
  const unsupportedReason = text(value.unsupportedReason)
  const mode = openModeForSurvey(
    surveyType,
    anonymous,
    canPreview,
    canAnswer,
    invitationAnswered,
    invitationCode,
    unsupportedReason,
  )

  return {
    id: positiveInteger(value.iid ?? value["@id"], "survey id"),
    title: plainText(value.title) || "Survey",
    subtitle: plainText(value.subtitle),
    code: text(value.code),
    language: text(value.language),
    availableFrom: nullableText(value.availableFrom),
    availableUntil: nullableText(value.availableUntil),
    availabilityStatus: availabilityStatus(value.availabilityStatus),
    anonymous,
    invitedCount: count(value.invited),
    answeredCount: count(value.answered),
    questionCount: numeric(value.questionCount),
    surveyType,
    surveyTypeLabel: text(value.surveyTypeLabel) || "Survey",
    mandatory: boolean(value.mandatory),
    visible: value.visible === undefined || boolean(value.visible),
    canPreview,
    canAnswer,
    invitationAnswered,
    invitationLpItemId: Math.max(0, Math.trunc(numeric(value.invitationLpItemId) ?? 0)),
    invitationCode,
    unsupportedReason,
    openMode: mode.openMode,
    unavailableReason: mode.unavailableReason,
  }
}

export function normalizeSurveyCollection(value: unknown): SurveyCollection {
  if (!isRecord(value)) {
    throw new SurveyContractError("The survey list response is invalid.")
  }

  const items = collectionItems(value, "survey list").map(normalizeSurveySummary)

  return {
    items,
    totalItems: numeric(value.totalItems) ?? items.length,
    canManage: boolean(value.canManage),
  }
}

function normalizeOption(value: unknown): SurveyOption {
  if (!isRecord(value)) {
    throw new SurveyContractError("A survey option is invalid.")
  }

  return {
    id: positiveInteger(value.iid, "survey option id"),
    label: plainText(value.label ?? value.text) || "Option",
    value: numeric(value.value) ?? 0,
    isOther: boolean(value.isOther),
  }
}

function normalizeQuestion(value: unknown): SurveyQuestion {
  if (!isRecord(value)) {
    throw new SurveyContractError("A survey question is invalid.")
  }

  return {
    id: positiveInteger(value.iid, "survey question id"),
    text: plainText(value.question) || "Question",
    comment: plainText(value.comment),
    type: text(value.type),
    typeLabel: text(value.typeLabel) || text(value.type) || "Question",
    required: boolean(value.isRequired),
    supported: value.isSupported === undefined || boolean(value.isSupported),
    maxValue: numeric(value.maxValue),
    parentQuestionId: Math.max(0, Math.trunc(numeric(value.parentQuestionId) ?? 0)) || null,
    parentOptionId: Math.max(0, Math.trunc(numeric(value.parentOptionId) ?? 0)) || null,
    options: Array.isArray(value.options) ? value.options.map(normalizeOption) : [],
  }
}

function normalizePages(rawPages: unknown, questions: SurveyQuestion[]): SurveyPage[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  const pages: SurveyPage[] = []

  if (Array.isArray(rawPages)) {
    rawPages.forEach((rawPage, index) => {
      if (!Array.isArray(rawPage)) return

      const pageQuestions = rawPage
        .map((questionId) => numeric(questionId))
        .filter((questionId): questionId is number => questionId !== null)
        .map((questionId) => byId.get(questionId))
        .filter((question): question is SurveyQuestion => Boolean(question))

      if (pageQuestions.length) {
        pages.push({
          number: index + 1,
          questions: pageQuestions,
        })
      }
    })
  }

  if (pages.length) return pages

  const pageQuestions = questions.filter((question) => question.type !== "pagebreak")

  return pageQuestions.length
    ? [
        {
          number: 1,
          questions: pageQuestions,
        },
      ]
    : []
}

function normalizeProfileOption(value: unknown): SurveyProfileOption {
  if (!isRecord(value)) {
    throw new SurveyContractError("A survey profile option is invalid.")
  }

  return {
    value: text(value.value),
    label: plainText(value.label) || text(value.value),
  }
}

function normalizeProfileField(value: unknown): SurveyProfileField {
  if (!isRecord(value)) {
    throw new SurveyContractError("A survey profile field is invalid.")
  }

  const type = text(value.type)
  const normalizedType: SurveyProfileField["type"] =
    type === "textarea" || type === "select" || type === "multiselect" ? type : "text"
  const rawValue = value.value

  return {
    key: text(value.key),
    label: plainText(value.label) || text(value.key) || "Profile field",
    type: normalizedType,
    inputType: text(value.inputType) || "text",
    value: Array.isArray(rawValue)
      ? rawValue.map((item) => text(item)).filter(Boolean)
      : text(rawValue),
    required: boolean(value.required),
    readOnly: boolean(value.readOnly),
    options: Array.isArray(value.options) ? value.options.map(normalizeProfileOption) : [],
    helpText: plainText(value.helpText),
  }
}

export function normalizeSurveyDetail(value: unknown): SurveyDetail {
  if (!isRecord(value)) {
    throw new SurveyContractError("The survey detail response is invalid.")
  }

  const survey = isRecord(value.survey) ? value.survey : {}
  const questions = Array.isArray(value.questions) ? value.questions.map(normalizeQuestion) : []

  return {
    id: positiveInteger(value.surveyId ?? survey.iid, "survey id"),
    title: plainText(survey.title) || "Survey",
    subtitle: plainText(survey.subtitle),
    code: text(survey.code),
    intro: plainText(survey.intro),
    thanks: plainText(survey.thanks),
    anonymous: boolean(survey.anonymous),
    oneQuestionPerPage: boolean(survey.oneQuestionPerPage),
    displayQuestionNumber: boolean(survey.displayQuestionNumber),
    availableFrom: nullableText(survey.availableFrom),
    availableUntil: nullableText(survey.availableUntil),
    surveyType: numeric(survey.surveyType) ?? 0,
    invitationCode: text(value.invitationCode),
    csrfToken: text(value.csrfToken),
    preview: boolean(value.preview),
    canSubmit: boolean(value.canSubmit),
    isAnswered: boolean(value.isAnswered),
    isFinished: boolean(value.isFinished),
    message: plainText(value.message),
    pages: normalizePages(value.pages, questions),
    answers: isRecord(value.answers) ? value.answers : {},
    profileFields: Array.isArray(value.profileFields)
      ? value.profileFields.map(normalizeProfileField)
      : [],
    settings: {
      backwardsEnabled: isRecord(value.settings) && boolean(value.settings.backwardsEnabled),
      allowAnsweredQuestionEdit:
        isRecord(value.settings) && boolean(value.settings.allowAnsweredQuestionEdit),
    },
  }
}

function optionLabel(question: SurveyQuestion, optionId: unknown): string | null {
  const id = numeric(optionId)
  if (id === null) return null

  return question.options.find((option) => option.id === id)?.label ?? `Option #${id}`
}

export function formatRecordedAnswers(
  question: SurveyQuestion,
  answers: Readonly<Record<string, unknown>>,
): string[] {
  const answer = answers[String(question.id)]
  const otherAnswer = text(answers[`other_${question.id}`])

  if (question.type === "open" || question.type === "comment") {
    const openAnswer = text(answer)
    return openAnswer ? [openAnswer] : []
  }

  if (question.type === "score" && isRecord(answer)) {
    return Object.entries(answer).map(([optionId, score]) => {
      const label = optionLabel(question, optionId) ?? `Option #${optionId}`
      return `${label}: ${text(score) || numeric(score) || 0}`
    })
  }

  const selected = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer]
  const labels = selected
    .map((optionId) => optionLabel(question, optionId))
    .filter((label): label is string => Boolean(label))

  if (otherAnswer) {
    labels.push(otherAnswer)
  }

  return labels
}
