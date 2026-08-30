<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import { translatedPlainText } from "@/domain/content/translatedHtml"
import ExerciseAnswerFeedback from "@/components/exercises/ExerciseAnswerFeedback.vue"
import ExerciseRuntimeQuestionCard from "@/components/exercises/ExerciseRuntimeQuestionCard.vue"
import ExerciseStructuralHtml from "@/components/exercises/ExerciseStructuralHtml.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildExerciseResultRoute,
  buildExercisesRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import {
  hasExerciseLearningPathRouteContext,
  parseExerciseLearningPathRouteContext,
} from "@/domain/exercises/learningPathContext"
import {
  createExerciseAnswerState,
  isExerciseAnswerProvided,
  isSupportedExerciseQuestion,
} from "@/domain/exercises/answers"
import {
  isImmediateExerciseFeedbackType,
  withExerciseFeedbackFallbackAction,
} from "@/domain/exercises/feedback"
import {
  exerciseRuntimeCompatibilityReason,
  isExercisePreviousNavigationAllowed,
  isExerciseQuestionTitleVisible,
} from "@/domain/exercises/runtimeCompatibility"
import { localizeExerciseQuestionContent } from "@/domain/exercises/presentation"
import {
  createExerciseQuestionTimerAnchor,
  exerciseQuestionTimerRemainingSeconds,
  exerciseQuestionTimerSpentSeconds,
  isClientTimedExerciseQuestion,
  savedExerciseQuestionSeconds,
  type ExerciseQuestionTimerAnchor,
} from "@/domain/exercises/questionTimer"
import type {
  ExerciseAnswerFeedback as ExerciseAnswerFeedbackState,
  ExerciseAnswerState,
} from "@/domain/exercises/types"
import {
  normalizeExerciseRuntimePages,
  sanitizeExerciseStructuralHtml,
  usesExerciseRuntimePages,
} from "@/domain/exercises/runtimePages"
import { BrowserExternalLinkPresenter } from "@/services/links/ExternalLinkPresenter"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useExercisesStore } from "@/stores/exercises"
import { useLocaleStore } from "@/stores/locale"

const props = defineProps<{
  courseId: string
  exerciseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
  origin: string | null
  learningPathId: string | null
  learningPathItemId: string | null
  learningPathItemViewId: string | null
  learningPathTitle: string | null
}>()

const { t } = useI18n()
const router = useRouter()
const campusStore = useCampusStore()
const connectivityStore = useConnectivityStore()
const store = useExercisesStore()
const localeStore = useLocaleStore()
const externalLinkPresenter = new BrowserExternalLinkPresenter()
const confirmedSavedAnswers = ref(false)
const remainingSeconds = ref<number | null>(null)
const questionRemainingSeconds = ref<number | null>(null)
const previewFinished = ref(false)
const reviewFlowStarted = ref(false)
const reviewSummaryVisible = ref(false)
const pendingAnswerFiles = ref<Record<number, File | null>>({})
const currentRuntimePageIndex = ref(0)
const activeFeedback = ref<ExerciseAnswerFeedbackState | null>(null)
const feedbackActionError = ref("")
let timer: ReturnType<typeof setInterval> | null = null
let questionTimer: ReturnType<typeof setInterval> | null = null
let questionTimerAnchor: ExerciseQuestionTimerAnchor | null = null
let questionTimerExpiryHandledForQuestionId: number | null = null
const questionTimerSavedSeconds = ref<Record<number, number>>({})

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const numericExerciseId = computed(() => Number(props.exerciseId))
const validExerciseId = computed(
  () => Number.isInteger(numericExerciseId.value) && numericExerciseId.value > 0,
)
const learningPathContext = computed(() => parseExerciseLearningPathRouteContext(props))
const invalidLearningPathContext = computed(
  () => hasExerciseLearningPathRouteContext(props) && !learningPathContext.value,
)
const backRoute = computed(() =>
  context.value && learningPathContext.value
    ? buildLearningPathDetailRoute(
        context.value,
        learningPathContext.value.learningPathId,
        learningPathContext.value.learningPathTitle || undefined,
      )
    : context.value
      ? buildExercisesRoute(context.value)
      : { name: "courses" },
)
const errorDescription = computed(() => t(`exercises.errors.${store.errorCode ?? "server"}`))
const contentLocale = computed(() => localeStore.contentLocale)
const contentFallbackLocales = computed(() => localeStore.contentFallbackLocales)
const runtimePages = computed(() =>
  store.runtime
    ? normalizeExerciseRuntimePages(store.runtime.settings, store.runtime.questions)
    : [],
)
const usesRuntimePages = computed(() =>
  store.runtime
    ? usesExerciseRuntimePages(store.runtime.settings, runtimePages.value)
    : false,
)
const currentRuntimePage = computed(() =>
  usesRuntimePages.value
    ? (runtimePages.value[currentRuntimePageIndex.value] ?? null)
    : null,
)
const answerableQuestionMap = computed(
  () => new Map(store.answerableQuestions.map((item) => [item.id, item])),
)
const isReviewQuestionMode = computed(() => reviewFlowStarted.value && !reviewSummaryVisible.value)
const visibleQuestions = computed(() => {
  if (isReviewQuestionMode.value) return store.currentQuestion ? [store.currentQuestion] : []

  if (usesRuntimePages.value && currentRuntimePage.value) {
    return currentRuntimePage.value.questionIds
      .map((questionId) => answerableQuestionMap.value.get(questionId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }

  return store.currentQuestion ? [store.currentQuestion] : []
})
const displayQuestions = computed(() =>
  visibleQuestions.value.map((item) =>
    localizeExerciseQuestionContent(item, contentLocale.value, contentFallbackLocales.value),
  ),
)
const visibleQuestionCards = computed(() =>
  displayQuestions.value.flatMap((item) => {
    const answer = store.answers[item.id]
    return answer ? [{ question: item, answer }] : []
  }),
)
const question = computed(() => visibleQuestions.value[0] ?? null)
const pendingCurrentFile = computed(() =>
  question.value ? (pendingAnswerFiles.value[question.value.id] ?? null) : null,
)
const navigationIndex = computed(() =>
  usesRuntimePages.value && !isReviewQuestionMode.value
    ? currentRuntimePageIndex.value
    : store.currentQuestionIndex,
)
const navigationTotal = computed(() =>
  usesRuntimePages.value && !isReviewQuestionMode.value
    ? runtimePages.value.length
    : store.answerableQuestions.length,
)
const progress = computed(() =>
  navigationTotal.value
    ? Math.round(((navigationIndex.value + 1) / navigationTotal.value) * 100)
    : 0,
)
const isImmediateFeedbackRuntime = computed(() =>
  isImmediateExerciseFeedbackType(store.runtime?.settings.feedbackType),
)
const requiresConfirmation = computed(
  () => !isImmediateFeedbackRuntime.value && store.runtime?.settings.confirmSavedAnswers === true,
)
const reviewEnabled = computed(
  () =>
    !isImmediateFeedbackRuntime.value && Number(store.runtime?.settings.reviewAnswers ?? 0) > 0,
)
const hasFinalReview = computed(
  () => !isImmediateFeedbackRuntime.value && (reviewEnabled.value || store.requiresAllAnswers),
)
const hasActiveFeedback = computed(() => activeFeedback.value !== null)
const isTeacherPreview = computed(() => store.runtime?.canManage === true && !store.runtime.attempt)
const currentTimedQuestion = computed(() => {
  if (!store.runtime?.attempt || isTeacherPreview.value || visibleQuestions.value.length !== 1) return null

  const activeQuestion = question.value
  return activeQuestion &&
    isClientTimedExerciseQuestion(store.runtime.settings, activeQuestion.duration)
    ? activeQuestion
    : null
})
const isQuestionTimeExpired = computed(
  () => currentTimedQuestion.value !== null && questionRemainingSeconds.value === 0,
)
const runtimeCompatibilityReason = computed(() =>
  store.runtime
    ? exerciseRuntimeCompatibilityReason(
        store.runtime.settings,
        runtimePages.value,
        campusStore.selectedCampus?.baseUrl ?? null,
        store.runtime.questions,
      )
    : null,
)
const canUseNativeRuntime = computed(
  () =>
    store.runtime?.settings.requiresLegacyRuntime !== true &&
    !store.hasUnsupportedQuestions &&
    runtimeCompatibilityReason.value === null,
)
const canUseMobileAttempt = computed(() => canUseNativeRuntime.value)
const previousNavigationAllowed = computed(() =>
  store.runtime ? isExercisePreviousNavigationAllowed(store.runtime.settings) : true,
)
const showQuestionTitle = computed(() =>
  store.runtime ? isExerciseQuestionTitleVisible(store.runtime.settings) : true,
)
const preventCopyPaste = computed(
  () => store.runtime?.settings.preventCopyPaste === true && !isTeacherPreview.value,
)
const reviewItems = computed(() =>
  store.answerableQuestions.map((item, index) => {
    const answer = store.answers[item.id]

    return {
      id: item.id,
      index,
      title: plainText(item.title),
      answered:
        store.savedQuestionIds.includes(item.id) ||
        Boolean(answer && isExerciseAnswerProvided(item, answer)),
      marked: store.reviewQuestionIds.includes(item.id) || Boolean(answer?.reviewLater),
    }
  }),
)
const campusExerciseUrl = computed(() => {
  const baseUrl = campusStore.selectedCampus?.baseUrl
  const path = store.runtime?.legacyUrls.overview
  if (!baseUrl || !path) return null

  try {
    const campusUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
    const targetUrl = new URL(path.replace(/^\/+/, ""), campusUrl)

    return targetUrl.origin === campusUrl.origin ? targetUrl.toString() : null
  } catch {
    return null
  }
})
const startBlockMessage = computed(() => {
  if (!store.runtime || store.runtime.attempt) return null
  if (store.runtime.canManage) return null
  if (!connectivityStore.campusAvailable) return t("exercises.offlineAttemptNotPrepared")
  if (!store.runtime.canStartAttempt) return t("exercises.startUnavailable")
  return null
})

function plainText(value: string): string {
  return translatedPlainText(value, contentLocale.value, contentFallbackLocales.value)
}

function preventRestrictedClipboard(event: ClipboardEvent): void {
  if (preventCopyPaste.value) event.preventDefault()
}

function structuralHtml(value: string): string {
  return sanitizeExerciseStructuralHtml(
    value,
    contentLocale.value,
    contentFallbackLocales.value,
  )
}

function clearActiveFeedback(): void {
  activeFeedback.value = null
  feedbackActionError.value = ""
}

function captureAnswerFeedback(questionId: number, navigationAction: string): boolean {
  const feedback = store.lastAnswerFeedback
  if (!feedback?.enabled) return false

  activeFeedback.value = withExerciseFeedbackFallbackAction(
    {
      ...feedback,
      questionId: feedback.questionId || questionId,
    },
    navigationAction,
  )
  feedbackActionError.value = ""
  return true
}

function navigateToFeedbackQuestion(questionId: number): boolean {
  const questionIndex = store.answerableQuestions.findIndex((item) => item.id === questionId)
  if (questionIndex < 0) return false

  if (usesRuntimePages.value && !isReviewQuestionMode.value) {
    const pageIndex = runtimePages.value.findIndex((page) => page.questionIds.includes(questionId))
    if (pageIndex < 0) return false
    currentRuntimePageIndex.value = pageIndex
    syncStoreQuestionIndexForPage(pageIndex)
  } else {
    store.currentQuestionIndex = questionIndex
  }

  return true
}

function openFeedbackOnCampus(): void {
  if (!campusExerciseUrl.value) return

  try {
    externalLinkPresenter.open(campusExerciseUrl.value)
  } catch {
    feedbackActionError.value = t("exercises.feedback.destinationInvalid")
  }
}

function feedbackDestinationUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""

  try {
    return new URL(trimmed).toString()
  } catch {
    const baseUrl = campusStore.selectedCampus?.baseUrl
    if (!baseUrl) return ""

    try {
      return new URL(trimmed, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
    } catch {
      return ""
    }
  }
}

async function finishAfterFeedback(): Promise<void> {
  if (!context.value) return

  const attemptId = await store.finishAttempt(
    context.value,
    numericExerciseId.value,
    confirmedSavedAnswers.value,
    learningPathContext.value,
    null,
    true,
  )
  if (!attemptId) return

  clearActiveFeedback()
  stopTimer()
  await router.push(
    buildExerciseResultRoute(
      context.value,
      numericExerciseId.value,
      attemptId,
      learningPathContext.value,
    ),
  )
}

async function proceedAfterFeedback(): Promise<void> {
  const feedback = activeFeedback.value
  if (!feedback) return

  feedbackActionError.value = ""

  if (feedback.afterAction === "finish") {
    await finishAfterFeedback()
    return
  }

  if (feedback.afterAction === "url") {
    const destinationUrl = feedbackDestinationUrl(feedback.targetUrl)
    if (!destinationUrl) {
      feedbackActionError.value = t("exercises.feedback.destinationInvalid")
      return
    }

    try {
      externalLinkPresenter.open(destinationUrl)
      clearActiveFeedback()
    } catch {
      feedbackActionError.value = t("exercises.feedback.destinationInvalid")
    }
    return
  }

  if (feedback.afterAction === "question") {
    if (!feedback.targetQuestionId || !navigateToFeedbackQuestion(feedback.targetQuestionId)) {
      feedbackActionError.value = t("exercises.feedback.destinationUnavailable")
      return
    }
    clearActiveFeedback()
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  if (feedback.afterAction === "next") {
    if (usesRuntimePages.value && !isReviewQuestionMode.value) {
      if (currentRuntimePageIndex.value < runtimePages.value.length - 1) {
        currentRuntimePageIndex.value += 1
        syncStoreQuestionIndexForPage(currentRuntimePageIndex.value)
      }
    } else if (store.currentQuestionIndex < store.answerableQuestions.length - 1) {
      store.currentQuestionIndex += 1
    }
    clearActiveFeedback()
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  if (feedback.afterAction === "previous") {
    if (usesRuntimePages.value && !isReviewQuestionMode.value) {
      if (currentRuntimePageIndex.value > 0) {
        currentRuntimePageIndex.value -= 1
        syncStoreQuestionIndexForPage(currentRuntimePageIndex.value)
      }
    } else if (store.currentQuestionIndex > 0) {
      store.currentQuestionIndex -= 1
    }
    clearActiveFeedback()
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  clearActiveFeedback()
}

function updateAnswer(questionId: number, value: ExerciseAnswerState): void {
  store.answers[questionId] = value
}

function selectAnswerFile(questionId: number, file: File | null): void {
  pendingAnswerFiles.value = {
    ...pendingAnswerFiles.value,
    [questionId]: file,
  }
  store.clearError()
}

function pendingFileFor(questionId: number): File | null {
  return pendingAnswerFiles.value[questionId] ?? null
}

function clearPendingAnswerFile(questionId: number): void {
  const next = { ...pendingAnswerFiles.value }
  delete next[questionId]
  pendingAnswerFiles.value = next
}

function syncRuntimePageIndex(): void {
  if (!usesRuntimePages.value || runtimePages.value.length === 0) {
    currentRuntimePageIndex.value = 0
    return
  }

  const currentQuestionId = store.runtime?.attempt?.currentQuestionId ?? store.currentQuestion?.id ?? 0
  const pageIndex = runtimePages.value.findIndex((page) =>
    page.questionIds.includes(Number(currentQuestionId)),
  )

  currentRuntimePageIndex.value = pageIndex >= 0
    ? pageIndex
    : Math.min(currentRuntimePageIndex.value, runtimePages.value.length - 1)
}

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

function stopQuestionTimer(): void {
  if (questionTimer) clearInterval(questionTimer)
  questionTimer = null
  questionTimerAnchor = null
}

function savedQuestionSeconds(questionId: number): number {
  return Math.max(
    0,
    questionTimerSavedSeconds.value[questionId] ??
      savedExerciseQuestionSeconds(store.runtime?.attempt, questionId),
  )
}

function questionSecondsSpent(questionId: number): number {
  const timedQuestion = store.answerableQuestions.find((item) => item.id === questionId)
  if (
    !timedQuestion ||
    !isClientTimedExerciseQuestion(store.runtime?.settings ?? {}, timedQuestion.duration)
  ) {
    return 0
  }

  if (questionTimerAnchor?.questionId === questionId) {
    return exerciseQuestionTimerSpentSeconds(questionTimerAnchor)
  }

  return savedQuestionSeconds(questionId)
}

function rememberQuestionSeconds(questionId: number, secondsSpent: number): void {
  if (questionId <= 0) return

  const value = Math.max(0, Math.floor(secondsSpent))
  questionTimerSavedSeconds.value = {
    ...questionTimerSavedSeconds.value,
    [questionId]: value,
  }

  const timedQuestion = currentTimedQuestion.value
  if (timedQuestion?.id !== questionId) return

  questionTimerAnchor = createExerciseQuestionTimerAnchor(
    questionId,
    timedQuestion.duration,
    value,
  )
  questionRemainingSeconds.value = exerciseQuestionTimerRemainingSeconds(questionTimerAnchor)
}

async function handleQuestionTimerExpired(): Promise<void> {
  const activeQuestionId = currentTimedQuestion.value?.id ?? 0
  if (
    activeQuestionId <= 0 ||
    questionTimerExpiryHandledForQuestionId === activeQuestionId ||
    store.saving ||
    store.finishing ||
    hasActiveFeedback.value
  ) {
    return
  }

  questionTimerExpiryHandledForQuestionId = activeQuestionId

  if (navigationIndex.value < navigationTotal.value - 1) {
    await go(navigationIndex.value + 1)
    return
  }

  await requestFinish()
}

function updateQuestionTimer(): void {
  const remaining = exerciseQuestionTimerRemainingSeconds(questionTimerAnchor)
  questionRemainingSeconds.value = remaining

  if (remaining === 0) void handleQuestionTimerExpired()
}

function syncQuestionTimer(): void {
  stopQuestionTimer()
  questionTimerExpiryHandledForQuestionId = null

  const timedQuestion = currentTimedQuestion.value
  if (!timedQuestion) {
    questionRemainingSeconds.value = null
    return
  }

  const questionId = timedQuestion.id
  const savedSeconds = savedQuestionSeconds(questionId)
  questionTimerAnchor = createExerciseQuestionTimerAnchor(
    questionId,
    timedQuestion.duration,
    savedSeconds,
  )
  questionRemainingSeconds.value = exerciseQuestionTimerRemainingSeconds(questionTimerAnchor)

  if (!questionTimerAnchor) return

  if (questionRemainingSeconds.value === 0) {
    void handleQuestionTimerExpired()
    return
  }

  questionTimer = setInterval(updateQuestionTimer, 250)
}

function startTimer(): void {
  stopTimer()
  remainingSeconds.value = store.runtime?.attempt?.remainingSeconds ?? null
  if (remainingSeconds.value === null) return
  timer = setInterval(() => {
    if (remainingSeconds.value === null || remainingSeconds.value <= 0) {
      stopTimer()
      if (remainingSeconds.value === 0) void finish()
      return
    }
    remainingSeconds.value -= 1
  }, 1000)
}

function formatDuration(value: number): string {
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const seconds = value % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") updateQuestionTimer()
}

async function load(): Promise<void> {
  if (!context.value || !validExerciseId.value || invalidLearningPathContext.value) return
  previewFinished.value = false
  reviewFlowStarted.value = false
  reviewSummaryVisible.value = false
  confirmedSavedAnswers.value = false
  pendingAnswerFiles.value = {}
  questionTimerSavedSeconds.value = {}
  clearActiveFeedback()
  await store.loadRuntime(context.value, numericExerciseId.value, learningPathContext.value)
  syncRuntimePageIndex()
  startTimer()
  syncQuestionTimer()
}

async function start(): Promise<void> {
  if (!context.value) return
  clearActiveFeedback()
  if (await store.startAttempt(context.value, numericExerciseId.value, learningPathContext.value)) {
    pendingAnswerFiles.value = {}
    syncRuntimePageIndex()
    startTimer()
    syncQuestionTimer()
  }
}

async function saveQuestionIds(questionIds: number[], navigationAction: string): Promise<boolean> {
  if (!context.value) return false
  if (isTeacherPreview.value) return true

  for (const [index, questionId] of questionIds.entries()) {
    const action = index === questionIds.length - 1 ? navigationAction : "none"
    const secondsSpent = questionSecondsSpent(questionId)
    const saved = await store.saveQuestionAnswer(
      context.value,
      numericExerciseId.value,
      questionId,
      action,
      learningPathContext.value,
      pendingFileFor(questionId),
      secondsSpent,
    )
    if (!saved) return false
    rememberQuestionSeconds(questionId, secondsSpent)
    clearPendingAnswerFile(questionId)
    if (captureAnswerFeedback(questionId, action)) return true
  }

  return true
}

function syncStoreQuestionIndexForPage(pageIndex: number): void {
  const page = runtimePages.value[pageIndex]
  const firstQuestionId = page?.questionIds[0]
  if (!firstQuestionId) return
  const questionIndex = store.answerableQuestions.findIndex((item) => item.id === firstQuestionId)
  if (questionIndex >= 0) store.currentQuestionIndex = questionIndex
}

async function goRuntimePage(index: number): Promise<void> {
  if (!usesRuntimePages.value || index < 0 || index >= runtimePages.value.length) return

  if (!isTeacherPreview.value) {
    const action = index > currentRuntimePageIndex.value ? "next" : "previous"
    const saved = await saveQuestionIds(currentRuntimePage.value?.questionIds ?? [], action)
    if (!saved && (currentRuntimePage.value?.questionIds.length ?? 0) > 0) return
    if (hasActiveFeedback.value) return
  }

  currentRuntimePageIndex.value = index
  syncStoreQuestionIndexForPage(index)
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function go(index: number): Promise<void> {
  if (!context.value) return
  if (usesRuntimePages.value && !isReviewQuestionMode.value) {
    await goRuntimePage(index)
    return
  }

  if (isTeacherPreview.value) {
    if (index >= 0 && index < store.answerableQuestions.length) {
      store.currentQuestionIndex = index
    }
  } else {
    const questionId = question.value?.id ?? 0
    const secondsSpent = questionSecondsSpent(questionId)
    const action = index > store.currentQuestionIndex ? "next" : "previous"
    const saved = await store.goToQuestion(
      context.value,
      numericExerciseId.value,
      index,
      learningPathContext.value,
      pendingCurrentFile.value,
      secondsSpent,
    )
    if (saved && questionId > 0) {
      rememberQuestionSeconds(questionId, secondsSpent)
      clearPendingAnswerFile(questionId)
      if (captureAnswerFeedback(questionId, action)) return
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function save(): Promise<void> {
  if (!context.value) return

  if (usesRuntimePages.value && !isReviewQuestionMode.value) {
    await saveQuestionIds(currentRuntimePage.value?.questionIds ?? [], "none")
    return
  }

  const questionId = question.value?.id ?? 0
  const secondsSpent = questionSecondsSpent(questionId)
  const saved = await store.saveCurrentAnswer(
    context.value,
    numericExerciseId.value,
    "none",
    learningPathContext.value,
    pendingCurrentFile.value,
    secondsSpent,
  )
  if (saved && questionId > 0) {
    rememberQuestionSeconds(questionId, secondsSpent)
    clearPendingAnswerFile(questionId)
    captureAnswerFeedback(questionId, "none")
  }
}

async function finish(): Promise<void> {
  if (!context.value) return

  let skipCurrentSave = reviewSummaryVisible.value
  if (usesRuntimePages.value && !isReviewQuestionMode.value && !reviewSummaryVisible.value) {
    const questionIds = currentRuntimePage.value?.questionIds ?? []
    if (questionIds.length > 0 && !(await saveQuestionIds(questionIds, "finish"))) return
    if (hasActiveFeedback.value) return
    skipCurrentSave = true
  }

  const questionId = question.value?.id ?? 0
  const currentSecondsSpent = skipCurrentSave ? 0 : questionSecondsSpent(questionId)
  const attemptId = await store.finishAttempt(
    context.value,
    numericExerciseId.value,
    confirmedSavedAnswers.value,
    learningPathContext.value,
    skipCurrentSave ? null : pendingCurrentFile.value,
    skipCurrentSave,
    currentSecondsSpent,
  )
  if (!attemptId && !skipCurrentSave && questionId > 0 && store.lastAnswerFeedback) {
    clearPendingAnswerFile(questionId)
    captureAnswerFeedback(questionId, "finish")
    return
  }

  if (attemptId) {
    if (!skipCurrentSave && questionId > 0) clearPendingAnswerFile(questionId)
    stopTimer()
    await router.push(
      buildExerciseResultRoute(
        context.value,
        numericExerciseId.value,
        attemptId,
        learningPathContext.value,
      ),
    )
  }
}

async function requestFinish(): Promise<void> {
  if (isTeacherPreview.value) {
    previewFinished.value = true
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }
  if (!context.value) return

  if (hasFinalReview.value && !reviewSummaryVisible.value) {
    if (usesRuntimePages.value && !isReviewQuestionMode.value) {
      const questionIds = currentRuntimePage.value?.questionIds ?? []
      if (questionIds.length > 0 && !(await saveQuestionIds(questionIds, "finish"))) return
      if (hasActiveFeedback.value) return
    } else {
      const questionId = question.value?.id ?? 0
      const secondsSpent = questionSecondsSpent(questionId)
      const saved = await store.saveCurrentAnswer(
        context.value,
        numericExerciseId.value,
        "finish",
        learningPathContext.value,
        pendingCurrentFile.value,
        secondsSpent,
      )
      if (!saved) return
      if (questionId > 0) {
        rememberQuestionSeconds(questionId, secondsSpent)
        clearPendingAnswerFile(questionId)
        if (captureAnswerFeedback(questionId, "finish")) return
      }
    }

    reviewFlowStarted.value = true
    reviewSummaryVisible.value = true
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  await finish()
}

function restartPreview(): void {
  previewFinished.value = false
  currentRuntimePageIndex.value = 0
  store.currentQuestionIndex = 0
  store.answers = Object.fromEntries(
    store.answerableQuestions.map((item) => [item.id, createExerciseAnswerState(item)]),
  )
  pendingAnswerFiles.value = {}
  clearActiveFeedback()
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function openReviewQuestion(index: number): void {
  if (index < 0 || index >= store.answerableQuestions.length) return
  store.currentQuestionIndex = index
  reviewFlowStarted.value = true
  reviewSummaryVisible.value = false
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function returnToReview(): Promise<void> {
  if (!context.value) return
  const questionId = question.value?.id ?? 0
  const secondsSpent = questionSecondsSpent(questionId)
  if (
    !(await store.saveCurrentAnswer(
      context.value,
      numericExerciseId.value,
      "none",
      learningPathContext.value,
      pendingCurrentFile.value,
      secondsSpent,
    ))
  ) {
    return
  }
  if (questionId > 0) {
    rememberQuestionSeconds(questionId, secondsSpent)
    clearPendingAnswerFile(questionId)
  }

  reviewSummaryVisible.value = true
  window.scrollTo({ top: 0, behavior: "smooth" })
}

watch(
  () => store.runtime?.attempt?.remainingSeconds,
  () => startTimer(),
)
watch(
  () => question.value?.id,
  () => syncQuestionTimer(),
)
watch(
  () => connectivityStore.campusAvailable,
  (available) => {
    if (!available || !isQuestionTimeExpired.value) return
    questionTimerExpiryHandledForQuestionId = null
    void handleQuestionTimerExpired()
  },
)

onMounted(() => {
  document.addEventListener("visibilitychange", handleVisibilityChange)
  void load()
})
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  stopTimer()
  stopQuestionTimer()
  store.resetRuntime()
})
</script>

<template>
  <CourseUnavailableState
    v-if="!context || !validExerciseId || invalidLearningPathContext"
    kind="missing"
  />

  <div
    v-else
    class="space-y-5"
    @copy="preventRestrictedClipboard"
    @cut="preventRestrictedClipboard"
    @paste="preventRestrictedClipboard"
  >
    <RouterLink
      :to="backRoute"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{
        learningPathContext
          ? learningPathContext.learningPathTitle || t("learningPaths.title")
          : t("exercises.backToExercises")
      }}
    </RouterLink>

    <LoadingState v-if="store.loading" :label="t('exercises.loadingRuntime')" />

    <ErrorState
      v-else-if="store.errorCode && !store.runtime"
      :title="t('exercises.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.runtime">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("exercises.assessment") }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">
          {{ plainText(store.runtime.title) }}
        </h1>
        <p v-if="store.runtime.description" class="mt-2 text-sm text-slate-600">
          {{ plainText(store.runtime.description) }}
        </p>
      </section>

      <section
        v-if="isTeacherPreview"
        class="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
      >
        <p class="font-semibold">{{ t("exercises.teacherPreview") }}</p>
        <p class="mt-1">{{ t("exercises.teacherPreviewDescription") }}</p>
      </section>

      <section
        v-if="!canUseNativeRuntime"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        role="alert"
      >
        <p>
          {{
            store.hasUnsupportedQuestions
              ? t("exercises.campusRuntimeRequired")
              : store.runtime.settings.requiresLegacyRuntime === true
                ? t("exercises.legacyRuntimeRequired")
                : t("exercises.runtimeConfigurationRequired")
          }}
        </p>
        <a
          v-if="campusExerciseUrl"
          :href="campusExerciseUrl"
          class="mt-3 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 font-semibold text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i class="pi pi-external-link" aria-hidden="true" />
          {{ t("exercises.openOnCampus") }}
        </a>
        <p v-if="campusExerciseUrl" class="mt-2 text-xs">
          {{ t("exercises.campusSignInNotice") }}
        </p>
      </section>

      <section
        v-if="!store.runtime.attempt && !isTeacherPreview && canUseMobileAttempt"
        class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
      >
        <p class="text-sm text-slate-600">
          {{ t("exercises.startDescription") }}
        </p>
        <p
          v-if="startBlockMessage"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900"
          role="alert"
        >
          {{ startBlockMessage }}
        </p>
        <button
          v-if="connectivityStore.campusAvailable"
          type="button"
          class="mt-4 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
          :disabled="store.saving || !store.runtime.canStartAttempt"
          @click="start"
        >
          {{ store.saving ? t("exercises.starting") : t("exercises.start") }}
        </button>
      </section>

      <section
        v-else-if="isTeacherPreview && previewFinished"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm"
      >
        <h2 class="text-lg font-semibold">{{ t("exercises.previewFinished") }}</h2>
        <p class="mt-2">{{ t("exercises.teacherPreviewDescription") }}</p>
        <button
          type="button"
          class="mt-4 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white"
          @click="restartPreview"
        >
          <i class="pi pi-refresh mr-2" aria-hidden="true" />
          {{ t("exercises.restartPreview") }}
        </button>
      </section>

      <section
        v-else-if="reviewSummaryVisible"
        class="space-y-4 rounded-2xl bg-white p-4 shadow-sm"
      >
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("exercises.reviewAnswers") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("exercises.reviewAnswersDescription") }}
          </p>
        </div>

        <div class="space-y-2">
          <button
            v-for="item in reviewItems"
            :key="item.id"
            type="button"
            class="flex min-h-touch w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left"
            @click="openReviewQuestion(item.index)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              :class="
                item.answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              "
            >
              {{ item.index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-slate-900">{{ item.title }}</span>
              <span class="text-xs text-slate-600">
                {{ item.answered ? t("exercises.answerSaved") : t("exercises.answerRequired") }}
              </span>
            </span>
            <i
              v-if="item.marked"
              class="pi pi-bookmark-fill text-amber-600"
              :aria-label="t('exercises.markedForReview')"
            />
            <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <p
          v-if="store.requiresAllAnswers && !store.allAnswersSaved"
          class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {{ t("exercises.answerAllBeforeFinish") }}
        </p>

        <label
          v-if="requiresConfirmation"
          class="flex min-h-touch items-center gap-3 text-sm text-slate-700"
        >
          <input v-model="confirmedSavedAnswers" name="confirm-saved-answers" type="checkbox" />
          {{ t("exercises.confirmSavedAnswers") }}
        </label>

        <button
          type="button"
          class="min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
          :disabled="
            !store.canSubmitFinal ||
            (requiresConfirmation && !confirmedSavedAnswers) ||
            store.saving ||
            store.finishing
          "
          @click="finish"
        >
          {{ store.finishing ? t("exercises.finishing") : t("exercises.finish") }}
        </button>
      </section>

      <template
        v-else-if="
          canUseNativeRuntime &&
          (visibleQuestionCards.length > 0 || currentRuntimePage) &&
          (store.runtime.attempt || isTeacherPreview)
        "
      >
        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              {{
                usesRuntimePages && !isReviewQuestionMode
                  ? t("exercises.pageProgress", {
                      current: navigationIndex + 1,
                      total: navigationTotal,
                    })
                  : t("exercises.questionProgress", {
                      current: navigationIndex + 1,
                      total: navigationTotal,
                    })
              }}
            </span>
            <span v-if="questionRemainingSeconds !== null">
              {{ t("exercises.questionTimeLeft") }}: {{ formatDuration(questionRemainingSeconds) }}
            </span>
            <span v-else-if="remainingSeconds !== null">{{ formatDuration(remainingSeconds) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-chamilo-600" :style="{ width: `${progress}%` }" />
          </div>
        </section>

        <section
          v-if="usesRuntimePages && !isReviewQuestionMode && currentRuntimePage?.pageBreak"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("exercises.section") }}
          </p>
          <ExerciseStructuralHtml
            v-if="currentRuntimePage.pageBreak.title"
            class="mt-1 text-lg font-semibold text-slate-900 [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full"
            :html="structuralHtml(currentRuntimePage.pageBreak.title)"
          />
          <ExerciseStructuralHtml
            v-if="currentRuntimePage.pageBreak.description"
            class="mt-2 text-sm text-slate-700 [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full"
            :html="structuralHtml(currentRuntimePage.pageBreak.description)"
          />
        </section>

        <section
          v-if="usesRuntimePages && !isReviewQuestionMode && currentRuntimePage?.media"
          class="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-800">
            {{ t("exercises.mediaContext") }}
          </p>
          <ExerciseStructuralHtml
            v-if="currentRuntimePage.media.title"
            class="mt-1 text-lg font-semibold text-slate-900 [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full [&_video]:max-w-full [&_audio]:max-w-full"
            :html="structuralHtml(currentRuntimePage.media.title)"
          />
          <ExerciseStructuralHtml
            v-if="currentRuntimePage.media.description"
            class="mt-2 text-sm text-slate-700 [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full [&_video]:max-w-full [&_audio]:max-w-full"
            :html="structuralHtml(currentRuntimePage.media.description)"
          />
        </section>

        <div v-if="visibleQuestionCards.length > 0" class="space-y-4">
          <ExerciseRuntimeQuestionCard
            v-for="card in visibleQuestionCards"
            :key="card.question.id"
            :question="card.question"
            :answer="card.answer"
            :disabled="store.saving || isQuestionTimeExpired || hasActiveFeedback || !isSupportedExerciseQuestion(card.question)"
            :show-title="showQuestionTitle"
            :review-enabled="reviewEnabled"
            :teacher-preview="isTeacherPreview"
            :pending-file="pendingFileFor(card.question.id)"
            @update-answer="updateAnswer(card.question.id, $event)"
            @select-file="selectAnswerFile(card.question.id, $event)"
          />
        </div>

        <ExerciseAnswerFeedback
          v-if="activeFeedback && activeFeedback.mode === 'direct'"
          :feedback="activeFeedback"
          :locale="contentLocale"
          :fallback-locales="contentFallbackLocales"
          :action-error="feedbackActionError"
          :campus-base-url="campusStore.selectedCampus?.baseUrl ?? null"
          :campus-url-available="Boolean(campusExerciseUrl)"
          @open-campus="openFeedbackOnCampus"
          @proceed="proceedAfterFeedback"
        />

        <div
          v-if="isQuestionTimeExpired"
          class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          {{ t("exercises.questionTimeReached") }}
        </div>

        <div
          v-if="store.errorCode"
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ errorDescription }}
        </div>

        <div
          v-if="!hasActiveFeedback"
          class="grid gap-3"
          :class="previousNavigationAllowed ? 'grid-cols-2' : 'grid-cols-1'"
        >
          <button
            v-if="previousNavigationAllowed"
            type="button"
            class="min-h-touch rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-40"
            :disabled="navigationIndex === 0 || store.saving || isQuestionTimeExpired"
            @click="go(navigationIndex - 1)"
          >
            <i class="pi pi-arrow-left mr-2" aria-hidden="true" />
            {{ t("actions.previous") }}
          </button>
          <button
            v-if="navigationIndex < navigationTotal - 1"
            type="button"
            class="min-h-touch rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
            :disabled="store.saving || isQuestionTimeExpired"
            @click="go(navigationIndex + 1)"
          >
            {{ t("actions.next") }}
            <i class="pi pi-arrow-right ml-2" aria-hidden="true" />
          </button>
          <button
            v-else-if="!isTeacherPreview && visibleQuestionCards.length > 0"
            type="button"
            class="min-h-touch rounded-xl border border-chamilo-700 bg-white px-4 font-semibold text-chamilo-700 disabled:opacity-50"
            :disabled="store.saving || isQuestionTimeExpired"
            @click="save"
          >
            {{ store.saving ? t("exercises.saving") : t("exercises.saveAnswer") }}
          </button>
        </div>

        <section v-if="!hasActiveFeedback" class="rounded-2xl bg-white p-4 shadow-sm">
          <button
            v-if="reviewFlowStarted && !isTeacherPreview"
            type="button"
            class="mb-3 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-50"
            :disabled="store.saving"
            @click="returnToReview"
          >
            <i class="pi pi-list-check mr-2" aria-hidden="true" />
            {{ t("exercises.backToReview") }}
          </button>
          <p
            v-if="!isTeacherPreview && store.requiresAllAnswers && !store.allAnswersSaved"
            class="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            {{ t("exercises.answerAllBeforeFinish") }}
          </p>
          <label
            v-if="requiresConfirmation && !isTeacherPreview"
            class="flex min-h-touch items-center gap-3 text-sm text-slate-700"
          >
            <input v-model="confirmedSavedAnswers" name="confirm-saved-answers" type="checkbox" />
            {{ t("exercises.confirmSavedAnswers") }}
          </label>
          <button
            type="button"
            class="mt-3 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
            :disabled="
              (!isTeacherPreview && !store.canFinish) ||
              (requiresConfirmation && !confirmedSavedAnswers) ||
              store.saving ||
              store.finishing
            "
            @click="requestFinish"
          >
            {{
              isTeacherPreview
                ? t("exercises.finishPreview")
                : store.finishing
                  ? t("exercises.finishing")
                  : hasFinalReview
                    ? t("exercises.reviewAnswers")
                    : t("exercises.finish")
            }}
          </button>
        </section>
      </template>
    </template>

    <ExerciseAnswerFeedback
      v-if="activeFeedback && activeFeedback.mode === 'popup'"
      :feedback="activeFeedback"
      :locale="contentLocale"
      :fallback-locales="contentFallbackLocales"
      :action-error="feedbackActionError"
      :campus-base-url="campusStore.selectedCampus?.baseUrl ?? null"
      :campus-url-available="Boolean(campusExerciseUrl)"
      popup
      @open-campus="openFeedbackOnCampus"
      @proceed="proceedAfterFeedback"
    />
  </div>
</template>
