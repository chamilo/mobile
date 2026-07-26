import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  applySavedExerciseAnswer,
  buildExerciseAnswerPayload,
  createExerciseAnswerState,
  hasUnsupportedExerciseQuestions,
  isExerciseAnswerProvided,
  isStructuralExerciseQuestion,
} from "@/domain/exercises/answers"
import type {
  ExerciseAnswerState,
  ExerciseList,
  ExerciseResult,
  ExerciseRuntime,
} from "@/domain/exercises/types"
import { mergeExerciseAnswerProgress } from "@/domain/exercises/progress"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  ExerciseApiService,
  ExerciseServiceError,
  type ExerciseServiceErrorCode,
} from "@/services/exercises/ExerciseApiService"
import { useCampusStore } from "@/stores/campus"

export const useExercisesStore = defineStore("exercises", () => {
  const list = ref<ExerciseList | null>(null)
  const runtime = ref<ExerciseRuntime | null>(null)
  const result = ref<ExerciseResult | null>(null)
  const answers = ref<Record<number, ExerciseAnswerState>>({})
  const currentQuestionIndex = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const finishing = ref(false)
  const errorCode = ref<ExerciseServiceErrorCode | null>(null)
  const errorMessage = ref("")
  const savedQuestionIds = ref<number[]>([])
  const reviewQuestionIds = ref<number[]>([])

  const answerableQuestions = computed(
    () =>
      runtime.value?.questions.filter((question) => !isStructuralExerciseQuestion(question)) ?? [],
  )
  const currentQuestion = computed(
    () => answerableQuestions.value[currentQuestionIndex.value] ?? null,
  )
  const hasUnsupportedQuestions = computed(() =>
    hasUnsupportedExerciseQuestions(runtime.value?.questions ?? []),
  )
  const requiresAllAnswers = computed(
    () => runtime.value?.settings.checkAllAnswersBeforeEndTest === true,
  )
  const allAnswersSaved = computed(() => {
    const saved = new Set(savedQuestionIds.value)
    return answerableQuestions.value.every((question) => {
      if (saved.has(question.id)) return true
      const answer = answers.value[question.id]

      return Boolean(answer && isExerciseAnswerProvided(question, answer))
    })
  })
  const canFinish = computed(
    () =>
      runtime.value?.attempt?.canFinish === true &&
      !hasUnsupportedQuestions.value &&
      !finishing.value,
  )
  const canSubmitFinal = computed(
    () => canFinish.value && (!requiresAllAnswers.value || allAnswersSaved.value),
  )

  function service(): ExerciseApiService {
    const campus = useCampusStore().selectedCampus
    if (!campus) throw new ExerciseServiceError("session_required", "No campus is selected.")
    return new ExerciseApiService(createAuthenticatedHttpClient(campus))
  }

  function setError(error: unknown): void {
    if (error instanceof ExerciseServiceError) {
      errorCode.value = error.code
      errorMessage.value = error.message
      return
    }
    errorCode.value = "server"
    errorMessage.value = "The exercise request failed."
  }

  function clearError(): void {
    errorCode.value = null
    errorMessage.value = ""
  }

  function syncReviewAnswerState(): void {
    const marked = new Set(reviewQuestionIds.value)
    for (const [questionId, answer] of Object.entries(answers.value)) {
      answer.reviewLater = marked.has(Number(questionId))
    }
  }

  function initializeAnswers(): void {
    const next: Record<number, ExerciseAnswerState> = {}
    for (const question of runtime.value?.questions ?? []) {
      if (isStructuralExerciseQuestion(question)) continue
      const state = createExerciseAnswerState(question)
      const savedRows = runtime.value?.attempt?.savedAnswers[String(question.id)] ?? []
      applySavedExerciseAnswer(question, savedRows, state)
      next[question.id] = state
    }
    answers.value = next
    savedQuestionIds.value = Object.entries(runtime.value?.attempt?.savedAnswers ?? {})
      .filter(([, rows]) => rows.length > 0)
      .map(([questionId]) => Number(questionId))
      .filter((questionId) => questionId > 0)
    reviewQuestionIds.value = [...(runtime.value?.attempt?.reviewQuestionIds ?? [])]
    syncReviewAnswerState()
  }

  function reorderQuestions(questionIds: number[]): void {
    if (!runtime.value || questionIds.length === 0) return
    const questionMap = new Map(runtime.value.questions.map((question) => [question.id, question]))
    const ordered = questionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((question): question is NonNullable<typeof question> => Boolean(question))
    const structural = runtime.value.questions.filter(isStructuralExerciseQuestion)
    if (ordered.length > 0) runtime.value.questions = [...ordered, ...structural]
  }

  async function loadList(context: CourseNavigationContext): Promise<void> {
    loading.value = true
    clearError()
    try {
      list.value = await service().getList(context)
    } catch (error) {
      setError(error)
    } finally {
      loading.value = false
    }
  }

  async function loadRuntime(context: CourseNavigationContext, exerciseId: number): Promise<void> {
    loading.value = true
    clearError()
    result.value = null
    try {
      runtime.value = await service().getRuntime(context, exerciseId)
      reorderQuestions(runtime.value.attempt?.questionIds ?? [])
      currentQuestionIndex.value = Math.max(
        0,
        Math.min(
          runtime.value.attempt?.currentQuestionIndex ?? 0,
          Math.max(0, answerableQuestions.value.length - 1),
        ),
      )
      initializeAnswers()
    } catch (error) {
      runtime.value = null
      setError(error)
    } finally {
      loading.value = false
    }
  }

  async function startAttempt(
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<boolean> {
    saving.value = true
    clearError()
    try {
      const attempt = await service().startAttempt(context, exerciseId)
      if (!attempt.success || attempt.usesLegacyRuntime) {
        throw new ExerciseServiceError(
          "invalid_response",
          attempt.message || "The attempt requires an unsupported legacy runtime.",
        )
      }
      if (!runtime.value) return false
      runtime.value.attempt = attempt
      runtime.value.canSubmit = attempt.canFinish
      reorderQuestions(attempt.questionIds)
      currentQuestionIndex.value = Math.max(0, attempt.currentQuestionIndex)
      initializeAnswers()
      return true
    } catch (error) {
      setError(error)
      return false
    } finally {
      saving.value = false
    }
  }

  async function saveCurrentAnswer(
    context: CourseNavigationContext,
    exerciseId: number,
    navigationAction = "none",
  ): Promise<boolean> {
    const question = currentQuestion.value
    const attemptId = runtime.value?.attempt?.attemptId
    const answerState = question ? answers.value[question.id] : undefined
    if (!question || !attemptId || !answerState) return false

    saving.value = true
    clearError()
    try {
      const response = await service().saveAnswer(context, exerciseId, attemptId, {
        questionId: question.id,
        answer: buildExerciseAnswerPayload(question, answerState),
        reviewLater: answerState.reviewLater,
        secondsSpent: 0,
        navigationAction,
      })
      if (!response.success) {
        throw new ExerciseServiceError(
          "invalid_response",
          response.message || "The answer could not be saved.",
        )
      }
      if (!runtime.value?.attempt) return false
      const progress = mergeExerciseAnswerProgress(runtime.value.attempt, response)
      savedQuestionIds.value = progress.savedQuestionIds
      reviewQuestionIds.value = progress.reviewQuestionIds
      runtime.value.attempt.canFinish = progress.canFinish
      syncReviewAnswerState()
      return true
    } catch (error) {
      setError(error)
      return false
    } finally {
      saving.value = false
    }
  }

  async function goToQuestion(
    context: CourseNavigationContext,
    exerciseId: number,
    index: number,
  ): Promise<void> {
    if (index < 0 || index >= answerableQuestions.value.length) return
    const action = index > currentQuestionIndex.value ? "next" : "previous"
    if (await saveCurrentAnswer(context, exerciseId, action)) currentQuestionIndex.value = index
  }

  async function finishAttempt(
    context: CourseNavigationContext,
    exerciseId: number,
    confirmedSavedAnswers: boolean,
  ): Promise<number | null> {
    const attemptId = runtime.value?.attempt?.attemptId
    if (!attemptId || hasUnsupportedQuestions.value) return null
    if (!(await saveCurrentAnswer(context, exerciseId, "finish"))) return null

    finishing.value = true
    clearError()
    try {
      const response = await service().finishAttempt(
        context,
        exerciseId,
        attemptId,
        confirmedSavedAnswers,
      )
      if (!response.success) {
        throw new ExerciseServiceError(
          "invalid_response",
          response.message || "The attempt could not be finished.",
        )
      }
      if (runtime.value?.attempt) runtime.value.attempt.status = response.status
      return attemptId
    } catch (error) {
      setError(error)
      return null
    } finally {
      finishing.value = false
    }
  }

  async function loadResult(
    context: CourseNavigationContext,
    exerciseId: number,
    attemptId: number,
  ): Promise<void> {
    loading.value = true
    clearError()
    try {
      result.value = await service().getResult(context, exerciseId, attemptId)
    } catch (error) {
      result.value = null
      setError(error)
    } finally {
      loading.value = false
    }
  }

  function resetRuntime(): void {
    runtime.value = null
    result.value = null
    answers.value = {}
    currentQuestionIndex.value = 0
    savedQuestionIds.value = []
    reviewQuestionIds.value = []
    clearError()
  }

  return {
    list,
    runtime,
    result,
    answers,
    currentQuestionIndex,
    currentQuestion,
    answerableQuestions,
    hasUnsupportedQuestions,
    requiresAllAnswers,
    allAnswersSaved,
    canFinish,
    canSubmitFinal,
    loading,
    saving,
    finishing,
    errorCode,
    errorMessage,
    savedQuestionIds,
    reviewQuestionIds,
    loadList,
    loadRuntime,
    startAttempt,
    saveCurrentAnswer,
    goToQuestion,
    finishAttempt,
    loadResult,
    resetRuntime,
    clearError,
  }
})
