import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { SurveyCollection, SurveyDetail, SurveyOpenMode } from "@/domain/surveys/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  SurveyApiService,
  type SurveyErrorCode,
  SurveyServiceError,
} from "@/services/surveys/SurveyApiService"
import { useCampusStore } from "@/stores/campus"

export type SurveyLoadStatus = "idle" | "loading" | "ready" | "error"
export type SurveyStoreErrorCode = SurveyErrorCode | "campus_required"

interface SurveyListState {
  status: SurveyLoadStatus
  data: SurveyCollection | null
  errorCode: SurveyStoreErrorCode | null
}

interface SurveyDetailState {
  status: SurveyLoadStatus
  data: SurveyDetail | null
  errorCode: SurveyStoreErrorCode | null
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
    errorCode: null,
  }
}

export const useSurveysStore = defineStore("surveys", () => {
  const list = reactive<SurveyListState>(listInitialState())
  const detail = reactive<SurveyDetailState>(detailInitialState())

  function service(): SurveyApiService | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    return new SurveyApiService(createAuthenticatedHttpClient(campus))
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
      list.data = await api.getSurveys(context)
      list.status = "ready"
      return true
    } catch (error) {
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
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      detail.status = "error"
      detail.data = null
      detail.errorCode = "campus_required"
      return false
    }

    detail.status = "loading"
    detail.data = null
    detail.errorCode = null

    try {
      detail.data = await api.getSurvey(context, surveyId, mode, invitationLpItemId)
      detail.status = "ready"
      return true
    } catch (error) {
      detail.errorCode = error instanceof SurveyServiceError ? error.code : "server"
      detail.status = "error"
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
    reset,
  }
})
