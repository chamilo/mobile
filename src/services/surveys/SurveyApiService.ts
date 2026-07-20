import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildSurveyDetailRequest,
  buildSurveysRequest,
  normalizeSurveyCollection,
  normalizeSurveyDetail,
  SurveyContractError,
} from "@/domain/surveys/contracts"
import type { SurveyCollection, SurveyDetail, SurveyOpenMode } from "@/domain/surveys/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type SurveyErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class SurveyServiceError extends Error {
  constructor(
    public readonly code: SurveyErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "SurveyServiceError"
  }
}

function mapError(error: unknown): SurveyServiceError {
  if (error instanceof SurveyContractError) {
    return new SurveyServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new SurveyServiceError("server", "The survey request failed.", error)
  }

  if (error.kind === "authentication") {
    return new SurveyServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new SurveyServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new SurveyServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new SurveyServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new SurveyServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new SurveyServiceError("not_found", error.message, error)
  }

  return new SurveyServiceError("server", error.message, error)
}

export class SurveyApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getSurveys(context: CourseNavigationContext): Promise<SurveyCollection> {
    try {
      const request = buildSurveysRequest(context)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/json",
        },
      })

      return normalizeSurveyCollection(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getSurvey(
    context: CourseNavigationContext,
    surveyId: number,
    mode: SurveyOpenMode,
    invitationLpItemId = 0,
  ): Promise<SurveyDetail> {
    try {
      const request = buildSurveyDetailRequest(context, surveyId, mode, invitationLpItemId)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/json",
        },
      })

      return normalizeSurveyDetail(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
