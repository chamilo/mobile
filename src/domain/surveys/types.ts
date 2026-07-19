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
  options: SurveyOption[]
}

export interface SurveyPage {
  number: number
  questions: SurveyQuestion[]
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
  preview: boolean
  canSubmit: boolean
  isAnswered: boolean
  isFinished: boolean
  message: string
  pages: SurveyPage[]
  answers: Record<string, unknown>
}
