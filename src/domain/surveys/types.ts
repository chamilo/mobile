export type SurveyAvailabilityStatus = "open" | "not_started" | "closed" | "unknown"

export type SurveyOpenMode = "answer" | "preview"

export interface SurveySummary {
  id: number
  title: string
  subtitle: string
  code: string
  language: string
  availableFrom: string | null
  availableUntil: string | null
  availabilityStatus: SurveyAvailabilityStatus
  anonymous: boolean
  invitedCount: number
  answeredCount: number
  questionCount: number | null
  surveyType: number
  surveyTypeLabel: string
  mandatory: boolean
  visible: boolean
  canPreview: boolean
  canAnswer: boolean
  invitationAnswered: boolean
  invitationLpItemId: number
  invitationCode: string
  unsupportedReason: string
  openMode: SurveyOpenMode | null
  unavailableReason: "anonymous" | "meeting" | "unsupported" | null
}

export interface SurveyCollection {
  items: SurveySummary[]
  totalItems: number
  canManage: boolean
}

export interface SurveyOption {
  id: number
  label: string
  value: number
  isOther: boolean
}

export interface SurveyQuestion {
  id: number
  text: string
  comment: string
  type: string
  typeLabel: string
  required: boolean
  supported: boolean
  maxValue: number | null
  parentQuestionId: number | null
  parentOptionId: number | null
  options: SurveyOption[]
}

export interface SurveyPage {
  number: number
  questions: SurveyQuestion[]
}

export interface SurveyProfileOption {
  value: string
  label: string
}

export interface SurveyProfileField {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "multiselect"
  inputType: string
  value: string | string[]
  required: boolean
  readOnly: boolean
  options: SurveyProfileOption[]
  helpText: string
}

export interface SurveySettings {
  backwardsEnabled: boolean
  allowAnsweredQuestionEdit: boolean
}

export interface SurveyDetail {
  id: number
  title: string
  subtitle: string
  code: string
  intro: string
  thanks: string
  anonymous: boolean
  oneQuestionPerPage: boolean
  displayQuestionNumber: boolean
  availableFrom: string | null
  availableUntil: string | null
  surveyType: number
  invitationCode: string
  csrfToken: string
  preview: boolean
  canSubmit: boolean
  isAnswered: boolean
  isFinished: boolean
  message: string
  pages: SurveyPage[]
  answers: Record<string, unknown>
  profileFields: SurveyProfileField[]
  settings: SurveySettings
}

export interface SurveyAnswerDraft {
  version: 1
  surveyId: number
  answers: Record<string, unknown>
  otherAnswers: Record<string, string>
  profileValues: Record<string, string | string[]>
  savedAt: string
  finalizedAt: string | null
}

export interface SurveySubmissionPayload {
  csrfToken: string
  answers: Record<string, unknown>
  otherAnswers: Record<string, string>
  profileValues: Record<string, string | string[]>
}

export interface SurveyValidationResult {
  valid: boolean
  questionErrors: Record<string, string>
  profileErrors: Record<string, string>
}
