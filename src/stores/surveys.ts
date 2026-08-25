import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildSurveyDraftSnapshotKey,
  createSurveyDraft,
  mergeSurveyDraft,
  validateSurveyDraft,
} from "@/domain/surveys/answers"
import type {
  SurveyAnswerDraft,
  SurveyCollection,
  SurveyDetail,
  SurveyOpenMode,
} from "@/domain/surveys/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { offlineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import { isOfflineNow, isUncertainDeliveryError } from "@/services/offline/OfflineWriteSupport"
import { offlineSnapshotRepository } from "@/services/offline/OfflineSnapshotRepository"
import {
  SurveyApiService,
  type SurveyErrorCode,
  SurveyServiceError,
} from "@/services/surveys/SurveyApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type SurveyLoadStatus = "idle" | "loading" | "ready" | "error"
export type SurveySubmitStatus = "idle" | "saving" | "queued" | "submitted" | "error"
export type SurveyStoreErrorCode =
  | SurveyErrorCode
  | "campus_required"
  | "profile_required"
  | "storage_failed"

interface SurveyListState {
  status: SurveyLoadStatus
  data: SurveyCollection | null
  errorCode: SurveyStoreErrorCode | null
}

interface SurveyDetailState {
  status: SurveyLoadStatus
  data: SurveyDetail | null
  draft: SurveyAnswerDraft | null
  submitStatus: SurveySubmitStatus
  errorCode: SurveyStoreErrorCode | null
  validationQuestionErrors: Record<string, string>
  validationProfileErrors: Record<string, string>
}

interface SurveyOfflineClientState {
  kind: "survey_answer_submit"
  context: CourseNavigationContext
  surveyId: number
  invitationLpItemId: number
  invitationCode: string
}

function listInitialState(): SurveyListState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function detailInitialState(): SurveyDetailState {
  return {
    status: "idle",
    data: null,
    draft: null,
    submitStatus: "idle",
    errorCode: null,
    validationQuestionErrors: {},
    validationProfileErrors: {},
  }
}

function surveyDedupeKey(
  context: CourseNavigationContext,
  surveyId: number,
  invitationLpItemId: number,
): string {
  return [
    "survey",
    context.courseId,
    context.sessionId ?? 0,
    context.membershipId ?? 0,
    context.sessionCourseId ?? 0,
    context.source,
    surveyId,
    invitationLpItemId,
  ].join(":")
}

export const useSurveysStore = defineStore("surveys", () => {
  const list = reactive<SurveyListState>(listInitialState())
  const detail = reactive<SurveyDetailState>(detailInitialState())

  function service(): SurveyApiService | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    return new SurveyApiService(createAuthenticatedHttpClient(campus))
  }

  function activeIdentity(): { campusId: string; userId: number } | null {
    const campus = useCampusStore().selectedCampus
    const profile = useAuthStore().profile
    if (!campus || !profile) return null

    return { campusId: campus.id, userId: profile.id }
  }

  function shouldUsePreparedData(): boolean {
    return isOfflineNow() || !useConnectivityStore().campusAvailable
  }

  async function applyLoadedSurvey(
    context: CourseNavigationContext,
    surveyId: number,
    invitationLpItemId: number,
    loaded: SurveyDetail,
  ): Promise<void> {
    detail.data = structuredClone(loaded)
    detail.status = "ready"
    detail.errorCode = null

    if (!loaded.preview && loaded.canSubmit) {
      const identity = activeIdentity()
      const snapshotKey = buildSurveyDraftSnapshotKey(context, surveyId, invitationLpItemId)
      const stored = identity
        ? await offlineSnapshotRepository
            .load<SurveyAnswerDraft>(identity.campusId, identity.userId, snapshotKey)
            .catch(() => null)
        : null
      detail.draft = mergeSurveyDraft(loaded, stored?.data ?? null)
      detail.submitStatus =
        queuedState(context, surveyId, invitationLpItemId) ??
        (detail.draft.finalizedAt ? "submitted" : "idle")
    } else {
      detail.draft = createSurveyDraft(loaded)
    }
  }

  async function restorePreparedList(context: CourseNavigationContext): Promise<boolean> {
    const identity = activeIdentity()
    if (!identity) return false

    const prepared = await offlineCoreFlowRepository
      .loadSurveyList(identity.campusId, identity.userId, context)
      .catch(() => null)

    if (!prepared) return false

    list.data = structuredClone(prepared)
    list.status = "ready"
    list.errorCode = null
    return true
  }

  async function restorePreparedDetail(
    context: CourseNavigationContext,
    surveyId: number,
    mode: SurveyOpenMode,
    invitationLpItemId: number,
    invitationCode: string,
  ): Promise<boolean> {
    const identity = activeIdentity()
    if (!identity) return false

    const prepared = await offlineCoreFlowRepository
      .loadSurveyDetail(
        identity.campusId,
        identity.userId,
        context,
        surveyId,
        mode,
        invitationLpItemId,
        invitationCode,
      )
      .catch(() => null)

    if (!prepared) return false

    await applyLoadedSurvey(context, surveyId, invitationLpItemId, prepared)
    return true
  }

  function queuedState(
    context: CourseNavigationContext,
    surveyId: number,
    invitationLpItemId: number,
  ): SurveySubmitStatus | null {
    const expectedKey = surveyDedupeKey(context, surveyId, invitationLpItemId)
    const operation = useOfflineSyncStore().operations.find((candidate) => {
      if (candidate.type !== "http_write" || !("category" in candidate.payload)) return false
      const payload = candidate.payload
      if (payload.category !== "survey_answer_submit") return false

      const clientState = payload.clientState as Partial<SurveyOfflineClientState> | undefined
      if (clientState?.kind !== "survey_answer_submit" || !clientState.context) return false

      const surveyIdValue = Number(clientState.surveyId)
      if (!Number.isInteger(surveyIdValue) || surveyIdValue <= 0) return false

      return (
        surveyDedupeKey(
          clientState.context,
          surveyIdValue,
          Number(clientState.invitationLpItemId ?? 0),
        ) === expectedKey
      )
    })

    if (!operation) return null

    return ["pending", "retryable", "syncing"].includes(operation.state) ? "queued" : "error"
  }

  async function loadSurveys(context: CourseNavigationContext): Promise<boolean> {
    const api = service()

    if (!api) {
      list.status = "error"
      list.data = null
      list.errorCode = "campus_required"
      return false
    }

    list.status = "loading"
    list.data = null
    list.errorCode = null

    try {
      if (shouldUsePreparedData() && (await restorePreparedList(context))) return true

      const loaded = await api.getSurveys(context)
      if (!useConnectivityStore().campusAvailable && (await restorePreparedList(context))) {
        return true
      }

      list.data = loaded
      list.status = "ready"
      const identity = activeIdentity()
      if (identity && list.data && useConnectivityStore().campusAvailable) {
        await offlineCoreFlowRepository
          .saveSurveyList(identity.campusId, identity.userId, context, list.data)
          .catch(() => undefined)
      }
      return true
    } catch (error) {
      if (await restorePreparedList(context)) return true
      list.errorCode = error instanceof SurveyServiceError ? error.code : "server"
      list.status = "error"
      return false
    }
  }

  async function loadSurvey(
    context: CourseNavigationContext,
    surveyId: number,
    mode: SurveyOpenMode,
    invitationLpItemId = 0,
    invitationCode = "",
    learningPathId = 0,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      Object.assign(detail, detailInitialState(), {
        status: "error",
        errorCode: "campus_required",
      })
      return false
    }

    Object.assign(detail, detailInitialState(), { status: "loading" })

    try {
      if (
        shouldUsePreparedData() &&
        (await restorePreparedDetail(context, surveyId, mode, invitationLpItemId, invitationCode))
      ) {
        return true
      }

      const loaded = await api.getSurvey(
        context,
        surveyId,
        mode,
        invitationLpItemId,
        invitationCode,
        learningPathId,
      )
      if (
        !useConnectivityStore().campusAvailable &&
        (await restorePreparedDetail(context, surveyId, mode, invitationLpItemId, invitationCode))
      ) {
        return true
      }

      const identity = activeIdentity()
      if (identity && useConnectivityStore().campusAvailable) {
        await offlineCoreFlowRepository
          .saveSurveyDetail(
            identity.campusId,
            identity.userId,
            context,
            surveyId,
            mode,
            invitationLpItemId,
            invitationCode,
            loaded,
          )
          .catch(() => undefined)
      }
      await applyLoadedSurvey(context, surveyId, invitationLpItemId, loaded)
      return true
    } catch (error) {
      if (
        await restorePreparedDetail(context, surveyId, mode, invitationLpItemId, invitationCode)
      ) {
        return true
      }
      detail.errorCode = error instanceof SurveyServiceError ? error.code : "server"
      detail.status = "error"
      return false
    }
  }

  async function persistDraft(
    context: CourseNavigationContext,
    invitationLpItemId = 0,
  ): Promise<boolean> {
    const identity = activeIdentity()
    if (!identity) {
      detail.errorCode = useCampusStore().selectedCampus ? "profile_required" : "campus_required"
      return false
    }
    if (!detail.data || !detail.draft) return false

    detail.draft.savedAt = new Date().toISOString()

    try {
      await offlineSnapshotRepository.save(
        identity.campusId,
        identity.userId,
        buildSurveyDraftSnapshotKey(context, detail.data.id, invitationLpItemId),
        detail.draft,
      )
      return true
    } catch {
      detail.errorCode = "storage_failed"
      return false
    }
  }

  async function setAnswer(
    context: CourseNavigationContext,
    questionId: number,
    value: unknown,
    invitationLpItemId = 0,
  ): Promise<void> {
    if (!detail.draft || detail.draft.finalizedAt) return

    detail.draft.answers[String(questionId)] = structuredClone(value)
    delete detail.validationQuestionErrors[String(questionId)]
    await persistDraft(context, invitationLpItemId)
  }

  async function setOtherAnswer(
    context: CourseNavigationContext,
    questionId: number,
    value: string,
    invitationLpItemId = 0,
  ): Promise<void> {
    if (!detail.draft || detail.draft.finalizedAt) return

    detail.draft.otherAnswers[String(questionId)] = value
    delete detail.validationQuestionErrors[String(questionId)]
    await persistDraft(context, invitationLpItemId)
  }

  async function setProfileValue(
    context: CourseNavigationContext,
    key: string,
    value: string | string[],
    invitationLpItemId = 0,
  ): Promise<void> {
    if (!detail.draft || detail.draft.finalizedAt) return

    detail.draft.profileValues[key] = structuredClone(value)
    delete detail.validationProfileErrors[key]
    await persistDraft(context, invitationLpItemId)
  }

  async function submitSurvey(
    context: CourseNavigationContext,
    invitationLpItemId = 0,
    learningPathId = 0,
  ): Promise<boolean> {
    const api = service()
    if (!api) {
      detail.errorCode = "campus_required"
      detail.submitStatus = "error"
      return false
    }
    if (!detail.data || !detail.draft || detail.draft.finalizedAt) return false

    const validation = validateSurveyDraft(detail.data, detail.draft)
    detail.validationQuestionErrors = validation.questionErrors
    detail.validationProfileErrors = validation.profileErrors

    if (!validation.valid) {
      detail.errorCode = "validation"
      detail.submitStatus = "error"
      return false
    }

    detail.submitStatus = "saving"
    detail.errorCode = null
    await persistDraft(context, invitationLpItemId)

    const request = api.buildSubmitRequest(
      context,
      detail.data,
      detail.draft,
      invitationLpItemId,
      learningPathId,
    )
    const queueSubmission = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await useOfflineSyncStore().enqueueHttpWrite({
        category: "survey_answer_submit",
        description: detail.data?.title || "Survey answers",
        dedupeKey: surveyDedupeKey(context, detail.data!.id, invitationLpItemId),
        uncertainDelivery,
        request,
        clientState: {
          kind: "survey_answer_submit",
          context: { ...context },
          surveyId: detail.data!.id,
          invitationLpItemId,
          invitationCode: detail.data!.invitationCode,
        } satisfies SurveyOfflineClientState,
      })

      if (queued) {
        detail.draft!.finalizedAt = new Date().toISOString()
        await persistDraft(context, invitationLpItemId)
        detail.submitStatus = uncertainDelivery ? "error" : "queued"
      }

      return queued && !uncertainDelivery
    }

    if (shouldUsePreparedData()) return queueSubmission()

    try {
      detail.data = await api.submitSurvey(
        context,
        detail.data,
        detail.draft,
        invitationLpItemId,
        learningPathId,
      )
      detail.draft.finalizedAt = new Date().toISOString()
      await persistDraft(context, invitationLpItemId)
      detail.submitStatus = "submitted"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueSubmission(true)
      detail.errorCode = error instanceof SurveyServiceError ? error.code : "server"
      detail.submitStatus = "error"
      return false
    }
  }

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(detail, detailInitialState())
  }

  return {
    list,
    detail,
    loadSurveys,
    loadSurvey,
    persistDraft,
    setAnswer,
    setOtherAnswer,
    setProfileValue,
    submitSurvey,
    reset,
  }
})
