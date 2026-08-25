export interface ExerciseLearningPathContext {
  origin: "learnpath"
  learningPathId: number
  learningPathItemId: number
  learningPathItemViewId: number
  learningPathTitle: string
}

export type ExerciseRuntimeStatus = "idle" | "loading" | "ready" | "saving" | "error"

export interface ExerciseLatestAttempt {
  id: number
  score: number
  maxScore: number
  percentage: number
  date: string
  status: string
}

export interface ExerciseListItem {
  id: number
  title: string
  description: string
  availabilityStatus: string
  startTime: string | null
  endTime: string | null
  duration: number | null
  maxAttempt: number
  passPercentage: number
  questionCount: number
  attemptCount: number
  latestAttempt: ExerciseLatestAttempt | null
  isLinkedToLearningPath: boolean
  isReadOnlyFromLearningPath: boolean
  learningPathReadOnlyMessage: string
  canOpen: boolean
}

export interface ExerciseList {
  items: ExerciseListItem[]
  totalItems: number
}

export interface ExerciseChoice {
  id: number
  answer: string
  position: number
}

export interface ExerciseTrueFalseOption {
  id: number
  title: string
  position: number
}

export interface ExerciseFillBlankSegment {
  type: "text" | "blank"
  text?: string
  position?: number
  inputSize?: number
}

export interface ExerciseMatchingRuntime {
  prompts: ExerciseChoice[]
  options: Array<ExerciseChoice & { label?: string }>
}

export interface ExerciseDraggableRuntime {
  items: ExerciseChoice[]
}

export interface ExerciseDropdownRuntime {
  options: ExerciseChoice[]
}

export interface ExerciseCalculatedVariation {
  id: number
  text: string
}

export interface ExerciseCalculatedRuntime {
  answerId: number | null
  text: string
  variations: ExerciseCalculatedVariation[]
}

export interface ExerciseReadingRuntime {
  speed: number
  text: string
}

export interface ExerciseHotspotPoint {
  x: number
  y: number
  answerId?: number
}

export type ExerciseHotspotZoneType = "square" | "circle" | "poly" | "delineation" | "oar"

export interface ExerciseHotspotZone {
  id: number
  answer: string
  position: number
  hotspotType: ExerciseHotspotZoneType
  score: number | null
  coordinates: string | null
}

export interface ExerciseHotspotRuntime {
  imageName: string
  imageUrl: string
  maxClicks: number
  combination: boolean
  delineation: boolean
  zones: ExerciseHotspotZone[]
}

export interface ExerciseQuestion {
  id: number
  title: string
  description: string
  type: number
  typeLabel: string
  position: number
  mandatory: boolean
  duration: number | null
  choices: ExerciseChoice[]
  trueFalseOptions: ExerciseTrueFalseOption[]
  fillBlanks: {
    segments: ExerciseFillBlankSegment[]
    separator: number
  } | null
  matching: ExerciseMatchingRuntime | null
  draggable: ExerciseDraggableRuntime | null
  dropdown: ExerciseDropdownRuntime | null
  calculated: ExerciseCalculatedRuntime | null
  reading: ExerciseReadingRuntime | null
  hotspot: ExerciseHotspotRuntime | null
  isContent: boolean
}

export interface SavedAnswerRow {
  answer: string
  position: number | null
}

export interface ExerciseAttempt {
  attemptId: number
  attemptNumber: number | null
  status: string
  success: boolean
  message: string
  currentQuestionIndex: number
  currentQuestionId: number | null
  questionIds: number[]
  totalQuestions: number
  startedAt: string | null
  expiredAt: string | null
  remainingSeconds: number | null
  canNavigatePrevious: boolean
  canNavigateNext: boolean
  canFinish: boolean
  usesLegacyRuntime: boolean
  savedAnswers: Record<string, SavedAnswerRow[]>
  reviewQuestionIds: number[]
}

export interface ExerciseRuntime {
  exerciseId: number
  title: string
  description: string
  settings: Record<string, unknown>
  questions: ExerciseQuestion[]
  questionCount: number
  totalScore: number
  canManage: boolean
  legacyUrls: Record<string, string>
  attempt: ExerciseAttempt | null
  canStartAttempt: boolean
  canSubmit: boolean
  usesLegacySubmit: boolean
}

export interface ExerciseAnswerState {
  choice: number | null
  choices: number[]
  trueFalse: Record<number, number>
  degreeCertainty: Record<number, number>
  blanks: Record<number, string>
  matching: Record<number, number>
  order: number[]
  dropdown: number | null
  calculated: string
  calculatedAnswerId: number | null
  text: string
  hotspotPoints: ExerciseHotspotPoint[]
  reviewLater: boolean
}

export interface ExerciseAnswerResponse {
  success: boolean
  message: string
  savedAnswer: SavedAnswerRow[]
  answeredQuestionIds: number[]
  reviewQuestionIds: number[]
  answeredCount: number
  canFinish: boolean
}

export interface ExerciseFinishResponse {
  success: boolean
  message: string
  status: string
  score: number
  maxScore: number
  completedAt: string | null
}

export interface ExerciseResult {
  exerciseId: number
  attemptId: number
  title: string
  description: string
  attempt: Record<string, unknown>
  questions: Array<Record<string, unknown>>
}
