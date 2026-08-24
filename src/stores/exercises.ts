import { computed, ref, shallowRef, toRaw } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { OfflineHttpWritePayload } from "@/domain/offline/types"
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
import { ExerciseRuntimeResourceService } from "@/services/exercises/ExerciseRuntimeResourceService"
import {
  offlineCoreFlowRepository,
  type OfflineCoreFlowRepository,
} from "@/services/offline/OfflineCoreFlowRepository"
import { selectExerciseRuntimeForPreparedStorage } from "@/services/offline/OfflineExercisePreparation"
import {
  buildExerciseOfflineStateKey,
  type ExerciseOfflineState,
  type ExerciseTimerAnchor,
  isRestorableExerciseOfflineState,
  OFFLINE_EXERCISE_STATE_VERSION,
} from "@/services/offline/OfflineExerciseState"
import { isOfflineNow, isUncertainDeliveryError } from "@/services/offline/OfflineWriteSupport"
import {
  offlineSnapshotRepository,
  type OfflineSnapshotRepository,
} from "@/services/offline/OfflineSnapshotRepository"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"

type ExerciseServiceFactory = (campus: CampusProfile) => ExerciseApiService

let exerciseServiceFactory: ExerciseServiceFactory = (campus) =>
  new ExerciseApiService(createAuthenticatedHttpClient(campus))
let exerciseCoreFlowRepository: OfflineCoreFlowRepository = offlineCoreFlowRepository
let exerciseSnapshotRepository: OfflineSnapshotRepository = offlineSnapshotRepository

export function setExercisesDependenciesForTests(input: {
  serviceFactory?: ExerciseServiceFactory
  coreFlows?: OfflineCoreFlowRepository
  snapshots?: OfflineSnapshotRepository
}): void {
  exerciseServiceFactory = input.serviceFactory ?? exerciseServiceFactory
  exerciseCoreFlowRepository = input.coreFlows ?? exerciseCoreFlowRepository
  exerciseSnapshotRepository = input.snapshots ?? exerciseSnapshotRepository
}

export function resetExercisesDependencies(): void {
  exerciseServiceFactory = (campus) => new ExerciseApiService(createAuthenticatedHttpClient(campus))
  exerciseCoreFlowRepository = offlineCoreFlowRepository
  exerciseSnapshotRepository = offlineSnapshotRepository
}

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
  const pendingAnswerFiles = shallowRef<Record<number, File>>({})

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

  function setPendingAnswerFile(questionId: number, file: File | null): void {
    const next = { ...pendingAnswerFiles.value }
    if (file) next[questionId] = file
    else delete next[questionId]
    pendingAnswerFiles.value = next
  }

  function isFileAnswerQuestion(type: number): boolean {
    return type === 13 || type === 23
  }

  function service(): ExerciseApiService {
    const campus = useCampusStore().selectedCampus
    if (!campus) throw new ExerciseServiceError("session_required", "No campus is selected.")
    return exerciseServiceFactory(campus)
  }

  function currentOfflineIdentity(): { campusId: string; userId: number } | null {
    const campus = useCampusStore().selectedCampus
    const userId = useAuthStore().profile?.id

    if (!campus || !userId) return null

    return { campusId: campus.id, userId }
  }

  function shouldUsePreparedData(): boolean {
    return isOfflineNow() || !useConnectivityStore().campusAvailable
  }

  function cloneForOfflineStorage<T>(value: T): T {
    const seen = new WeakMap<object, unknown>()

    const cloneValue = (entry: unknown): unknown => {
      if (entry === null || typeof entry !== "object") return entry

      const raw = toRaw(entry) as object
      const existing = seen.get(raw)
      if (existing !== undefined) return existing

      if (raw instanceof Date) return new Date(raw.getTime())
      if (raw instanceof Blob) return raw.slice(0, raw.size, raw.type)
      if (raw instanceof ArrayBuffer) return raw.slice(0)
      if (ArrayBuffer.isView(raw)) return structuredClone(raw)

      if (Array.isArray(raw)) {
        const copy: unknown[] = []
        seen.set(raw, copy)
        for (const item of raw) copy.push(cloneValue(item))
        return copy
      }

      if (raw instanceof Map) {
        const copy = new Map<unknown, unknown>()
        seen.set(raw, copy)
        for (const [key, item] of raw) copy.set(cloneValue(key), cloneValue(item))
        return copy
      }

      if (raw instanceof Set) {
        const copy = new Set<unknown>()
        seen.set(raw, copy)
        for (const item of raw) copy.add(cloneValue(item))
        return copy
      }

      const copy: Record<string, unknown> = {}
      seen.set(raw, copy)
      for (const [key, item] of Object.entries(raw)) copy[key] = cloneValue(item)
      return copy
    }

    return cloneValue(value) as T
  }

  async function restorePreparedList(context: CourseNavigationContext): Promise<boolean> {
    const identity = currentOfflineIdentity()
    if (!identity) return false

    const prepared = await exerciseCoreFlowRepository
      .loadExerciseList(identity.campusId, identity.userId, context)
      .catch(() => null)

    if (!prepared) return false

    list.value = cloneForOfflineStorage(prepared)
    clearError()
    return true
  }

  async function restorePreparedRuntime(
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<boolean> {
    const identity = currentOfflineIdentity()
    if (!identity) return false

    const prepared = await exerciseCoreFlowRepository
      .loadExerciseRuntime(identity.campusId, identity.userId, context, exerciseId)
      .catch(() => null)

    if (!prepared) return false

    runtime.value = cloneForOfflineStorage(prepared)
    reorderQuestions(runtime.value.attempt?.questionIds ?? [])
    currentQuestionIndex.value = Math.max(
      0,
      Math.min(
        runtime.value.attempt?.currentQuestionIndex ?? 0,
        Math.max(0, answerableQuestions.value.length - 1),
      ),
    )
    initializeAnswers()
    applyQueuedExerciseState(exerciseId)
    if (runtime.value.attempt) await saveOfflineState(context, exerciseId)
    clearError()
    return true
  }

  async function timerAnchorForSnapshot(
    context: CourseNavigationContext,
    exerciseId: number,
    activeRuntime: ExerciseRuntime,
  ): Promise<ExerciseTimerAnchor | null> {
    const attempt = activeRuntime.attempt
    const identity = currentOfflineIdentity()
    if (!attempt || !identity) return null

    const existing = await exerciseSnapshotRepository
      .load<ExerciseOfflineState>(
        identity.campusId,
        identity.userId,
        buildExerciseOfflineStateKey(context, exerciseId),
      )
      .catch(() => null)

    if (existing?.data.timerAnchor?.attemptId === attempt.attemptId) {
      return existing.data.timerAnchor
    }

    return {
      attemptId: attempt.attemptId,
      remainingSeconds: attempt.remainingSeconds,
      capturedAt: new Date().toISOString(),
    }
  }

  async function saveOfflineState(
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<void> {
    const identity = currentOfflineIdentity()
    const activeRuntime = runtime.value
    if (!identity || !activeRuntime?.attempt) return

    const timerAnchor = await timerAnchorForSnapshot(context, exerciseId, activeRuntime)

    await exerciseSnapshotRepository
      .save<ExerciseOfflineState>(
        identity.campusId,
        identity.userId,
        buildExerciseOfflineStateKey(context, exerciseId),
        {
          version: OFFLINE_EXERCISE_STATE_VERSION,
          exerciseId,
          runtime: cloneForOfflineStorage(activeRuntime),
          answers: cloneForOfflineStorage(answers.value),
          currentQuestionIndex: currentQuestionIndex.value,
          savedQuestionIds: [...savedQuestionIds.value],
          reviewQuestionIds: [...reviewQuestionIds.value],
          timerAnchor,
        },
      )
      .catch(() => undefined)
  }

  function adjustedRuntime(state: ExerciseOfflineState): ExerciseRuntime {
    const restored = cloneForOfflineStorage(state.runtime)
    const attempt = restored.attempt
    const anchor = state.timerAnchor
    if (!attempt || !anchor || anchor.attemptId !== attempt.attemptId) return restored

    if (attempt.expiredAt) {
      const expiresAt = Date.parse(attempt.expiredAt)
      if (Number.isFinite(expiresAt)) {
        attempt.remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        return restored
      }
    }

    if (anchor.remainingSeconds !== null) {
      const capturedAt = Date.parse(anchor.capturedAt)
      const elapsed = Number.isFinite(capturedAt)
        ? Math.max(0, Math.floor((Date.now() - capturedAt) / 1000))
        : 0
      attempt.remainingSeconds = Math.max(0, anchor.remainingSeconds - elapsed)
    }

    return restored
  }

  async function restoreOfflineState(
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<boolean> {
    const identity = currentOfflineIdentity()
    if (!identity) return false

    const record = await exerciseSnapshotRepository
      .load<ExerciseOfflineState>(
        identity.campusId,
        identity.userId,
        buildExerciseOfflineStateKey(context, exerciseId),
      )
      .catch(() => null)

    if (!record || !isRestorableExerciseOfflineState(record.data, exerciseId)) return false

    const restoredRuntime = adjustedRuntime(record.data)

    runtime.value = restoredRuntime
    answers.value = cloneForOfflineStorage(record.data.answers)
    currentQuestionIndex.value = Math.max(
      0,
      Math.min(record.data.currentQuestionIndex, Math.max(0, answerableQuestions.value.length - 1)),
    )
    savedQuestionIds.value = [...record.data.savedQuestionIds]
    reviewQuestionIds.value = [...record.data.reviewQuestionIds]
    applyQueuedExerciseState(exerciseId)
    return true
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

  function contextQuery(context: CourseNavigationContext): Record<string, number> {
    return {
      cid: context.courseId,
      ...(context.sessionId ? { sid: context.sessionId } : {}),
    }
  }

  function queuedExerciseWrites(exerciseId: number, attemptId: number) {
    return useOfflineSyncStore().operations.filter((operation) => {
      if (operation.type !== "http_write") return false
      const payload = operation.payload as OfflineHttpWritePayload
      const body = payload.request.body as Record<string, unknown> | undefined
      return Number(body?.exerciseId) === exerciseId && Number(body?.attemptId) === attemptId
    })
  }

  function applyQueuedExerciseState(exerciseId: number): void {
    const attemptId = runtime.value?.attempt?.attemptId
    if (!attemptId) return

    for (const operation of queuedExerciseWrites(exerciseId, attemptId)) {
      const payload = operation.payload as OfflineHttpWritePayload
      const body = payload.request.body as Record<string, unknown> | undefined

      if (payload.category === "exercise_answer") {
        const questionId = Number(body?.questionId)
        const clientState = payload.clientState as ExerciseAnswerState | undefined
        if (questionId > 0 && clientState)
          answers.value[questionId] = cloneForOfflineStorage(clientState)
        if (questionId > 0 && !savedQuestionIds.value.includes(questionId)) {
          savedQuestionIds.value = [...savedQuestionIds.value, questionId]
        }
        const reviewLater = body?.reviewLater === true
        reviewQuestionIds.value = reviewLater
          ? Array.from(new Set([...reviewQuestionIds.value, questionId]))
          : reviewQuestionIds.value.filter((id) => id !== questionId)
      }

      if (payload.category === "exercise_finish" && runtime.value?.attempt) {
        runtime.value.attempt.status = "pending_sync"
      }
    }

    syncReviewAnswerState()
  }

  async function loadList(context: CourseNavigationContext): Promise<void> {
    loading.value = true
    clearError()
    try {
      if (shouldUsePreparedData() && (await restorePreparedList(context))) return

      const loaded = await service().getList(context)
      if (!useConnectivityStore().campusAvailable && (await restorePreparedList(context))) return

      list.value = loaded
      const identity = currentOfflineIdentity()
      if (identity && list.value && useConnectivityStore().campusAvailable) {
        await exerciseCoreFlowRepository
          .saveExerciseList(identity.campusId, identity.userId, context, list.value)
          .catch(() => undefined)
      }
    } catch (error) {
      if (!(await restorePreparedList(context))) setError(error)
    } finally {
      loading.value = false
    }
  }

  async function loadRuntime(context: CourseNavigationContext, exerciseId: number): Promise<void> {
    loading.value = true
    clearError()
    result.value = null

    try {
      if (shouldUsePreparedData()) {
        if (await restoreOfflineState(context, exerciseId)) return
        if (await restorePreparedRuntime(context, exerciseId)) return
      }

      const loaded = await service().getRuntime(context, exerciseId)
      if (
        !useConnectivityStore().campusAvailable &&
        (await restorePreparedRuntime(context, exerciseId))
      ) {
        return
      }

      runtime.value = loaded
      const identity = currentOfflineIdentity()
      if (identity && useConnectivityStore().campusAvailable) {
        const existingPrepared = await exerciseCoreFlowRepository
          .loadExerciseRuntime(identity.campusId, identity.userId, context, exerciseId)
          .catch(() => null)
        const preparedForStorage = selectExerciseRuntimeForPreparedStorage(
          runtime.value,
          existingPrepared,
        )

        await exerciseCoreFlowRepository
          .saveExerciseRuntime(
            identity.campusId,
            identity.userId,
            context,
            exerciseId,
            preparedForStorage,
          )
          .catch(() => undefined)
      }
      reorderQuestions(runtime.value.attempt?.questionIds ?? [])
      currentQuestionIndex.value = Math.max(
        0,
        Math.min(
          runtime.value.attempt?.currentQuestionIndex ?? 0,
          Math.max(0, answerableQuestions.value.length - 1),
        ),
      )
      initializeAnswers()
      applyQueuedExerciseState(exerciseId)
      await saveOfflineState(context, exerciseId)
    } catch (error) {
      const restored =
        (await restoreOfflineState(context, exerciseId)) ||
        (await restorePreparedRuntime(context, exerciseId))

      if (!restored) {
        runtime.value = null
        setError(error)
      }
    } finally {
      loading.value = false
    }
  }

  async function startAttempt(
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<boolean> {
    if (shouldUsePreparedData()) {
      errorCode.value = "network"
      errorMessage.value =
        "Connect to the campus and prepare this exercise before using it offline."
      return false
    }

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
      const identity = currentOfflineIdentity()
      if (identity) {
        await exerciseCoreFlowRepository
          .saveExerciseRuntime(
            identity.campusId,
            identity.userId,
            context,
            exerciseId,
            runtime.value,
          )
          .catch(() => undefined)
      }
      await saveOfflineState(context, exerciseId)
      return true
    } catch (error) {
      setError(error)
      return false
    } finally {
      saving.value = false
    }
  }

  async function saveCurrentFileAnswer(
    context: CourseNavigationContext,
    exerciseId: number,
    navigationAction: string,
  ): Promise<boolean> {
    const question = currentQuestion.value
    const attempt = runtime.value?.attempt
    const answerState = question ? answers.value[question.id] : undefined
    if (!question || !attempt || !answerState) return false

    const pendingFile = pendingAnswerFiles.value[question.id]
    if (pendingFile && shouldUsePreparedData()) {
      setError(new ExerciseServiceError("network", "File answers require a connection to the campus."))
      return false
    }

    if (question.type === 13 && pendingFile && !/\.(wav|ogg)$/i.test(pendingFile.name)) {
      setError(new ExerciseServiceError("invalid_response", "Oral expression accepts WAV or OGG audio files."))
      return false
    }

    if (pendingFile) {
      const response = await service().uploadAnswer(context, exerciseId, attempt.attemptId, {
        questionId: question.id,
        file: pendingFile,
        reviewLater: answerState.reviewLater,
        secondsSpent: 0,
        navigationAction,
      })
      if (!response.success) {
        throw new ExerciseServiceError(
          "invalid_response",
          response.message || "The file answer could not be saved.",
        )
      }
      answerState.uploadedFiles = response.files
      setPendingAnswerFile(question.id, null)
      const progress = mergeExerciseAnswerProgress(attempt, response)
      savedQuestionIds.value = progress.savedQuestionIds
      reviewQuestionIds.value = progress.reviewQuestionIds
      attempt.canFinish = progress.canFinish
      syncReviewAnswerState()
      await saveOfflineState(context, exerciseId)
      return true
    }

    if ((answerState.uploadedFiles?.length ?? 0) === 0) return false

    const wasMarked = reviewQuestionIds.value.includes(question.id)
    if (wasMarked !== answerState.reviewLater && shouldUsePreparedData()) {
      setError(
        new ExerciseServiceError(
          "network",
          "Changing the review flag for a file answer requires a connection to the campus.",
        ),
      )
      return false
    }

    if (wasMarked !== answerState.reviewLater) {
      const response = await service().updateReviewLater(
        context,
        exerciseId,
        attempt.attemptId,
        question.id,
        answerState.reviewLater,
      )
      const progress = mergeExerciseAnswerProgress(attempt, response)
      savedQuestionIds.value = progress.savedQuestionIds
      reviewQuestionIds.value = progress.reviewQuestionIds
      attempt.canFinish = progress.canFinish
      syncReviewAnswerState()
    }

    await saveOfflineState(context, exerciseId)
    return true
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

    if (isFileAnswerQuestion(question.type)) {
      saving.value = true
      clearError()
      try {
        return await saveCurrentFileAnswer(context, exerciseId, navigationAction)
      } catch (error) {
        setError(error)
        return false
      } finally {
        saving.value = false
      }
    }

    saving.value = true
    clearError()
    const answerPayload = {
      questionId: question.id,
      answer: buildExerciseAnswerPayload(question, answerState),
      reviewLater: answerState.reviewLater,
      secondsSpent: 0,
      navigationAction,
    }
    const queueAnswer = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await useOfflineSyncStore().enqueueHttpWrite({
        category: "exercise_answer",
        description: `Exercise ${exerciseId}, question ${question.id}`,
        dedupeKey: `exercise:${exerciseId}:attempt:${attemptId}:question:${question.id}`,
        uncertainDelivery,
        clientState: cloneForOfflineStorage(answerState),
        request: {
          method: "POST",
          path: `/api/exercise/runtime/${exerciseId}/attempt/${attemptId}/answer`,
          query: contextQuery(context),
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
          body: { exerciseId, attemptId, ...answerPayload },
        },
      })

      if (queued && !uncertainDelivery) {
        if (!savedQuestionIds.value.includes(question.id)) {
          savedQuestionIds.value = [...savedQuestionIds.value, question.id]
        }
        reviewQuestionIds.value = answerState.reviewLater
          ? Array.from(new Set([...reviewQuestionIds.value, question.id]))
          : reviewQuestionIds.value.filter((id) => id !== question.id)
        if (runtime.value?.attempt) runtime.value.attempt.canFinish = true
        syncReviewAnswerState()
        await saveOfflineState(context, exerciseId)
      }
      return queued && !uncertainDelivery
    }

    try {
      if (shouldUsePreparedData()) return await queueAnswer()

      const response = await service().saveAnswer(context, exerciseId, attemptId, answerPayload)
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
      await saveOfflineState(context, exerciseId)
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueAnswer(true)
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
    if (await saveCurrentAnswer(context, exerciseId, action)) {
      currentQuestionIndex.value = index
      await saveOfflineState(context, exerciseId)
    }
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
    const queueFinish = async (uncertainDelivery = false): Promise<number | null> => {
      const queued = await useOfflineSyncStore().enqueueHttpWrite({
        category: "exercise_finish",
        description: `Finish exercise ${exerciseId}, attempt ${attemptId}`,
        dedupeKey: `exercise:${exerciseId}:attempt:${attemptId}:finish`,
        uncertainDelivery,
        request: {
          method: "POST",
          path: `/api/exercise/runtime/${exerciseId}/attempt/${attemptId}/finish`,
          query: contextQuery(context),
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
          body: { exerciseId, attemptId, confirmedSavedAnswers },
        },
      })
      if (queued && !uncertainDelivery && runtime.value?.attempt) {
        runtime.value.attempt.status = "pending_sync"
        await saveOfflineState(context, exerciseId)
      }
      return queued && !uncertainDelivery ? attemptId : null
    }

    try {
      if (shouldUsePreparedData()) return await queueFinish()

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
      await saveOfflineState(context, exerciseId)
      return attemptId
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueFinish(true)
      setError(error)
      return null
    } finally {
      finishing.value = false
    }
  }

  async function loadRuntimeImage(resourceUrl: string): Promise<Blob | null> {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    try {
      return await new ExerciseRuntimeResourceService(
        createAuthenticatedHttpClient(campus),
        campus.baseUrl,
      ).loadImage(resourceUrl)
    } catch {
      return null
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
      const pendingFinish = queuedExerciseWrites(exerciseId, attemptId).some(
        (operation) =>
          operation.type === "http_write" &&
          (operation.payload as OfflineHttpWritePayload).category === "exercise_finish",
      )

      if (pendingFinish) {
        result.value = {
          exerciseId,
          attemptId,
          title: runtime.value?.title ?? "Exercise result pending synchronization",
          description: runtime.value?.description ?? "",
          attempt: { status: "pending_sync" },
          questions: [],
        }
        clearError()
      } else {
        result.value = null
        setError(error)
      }
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
    pendingAnswerFiles.value = {}
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
    setPendingAnswerFile,
    goToQuestion,
    finishAttempt,
    loadRuntimeImage,
    loadResult,
    resetRuntime,
    clearError,
  }
})
