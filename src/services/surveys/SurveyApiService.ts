import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildSurveyDetailRequest,
  buildSurveySubmitRequest,
  buildSurveysRequest,
  normalizeSurveyCollection,
  normalizeSurveyDetail,
  SurveyContractError,
} from "@/domain/surveys/contracts"
import type {
  SurveyAnswerDraft,
  SurveyCollection,
  SurveyDetail,
  SurveyOpenMode,
} from "@/domain/surveys/types"
import { buildSurveySubmissionPayload } from "@/domain/surveys/answers"
import type { HttpClient, HttpRequest } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type SurveyErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "validation"
  | "conflict"
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

  if (error.kind === "http" && error.status === 409) {
    return new SurveyServiceError("conflict", error.message, error)
  }

  if (error.kind === "http" && [400, 422].includes(error.status ?? 0)) {
    return new SurveyServiceError("validation", error.message, error)
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
    invitationCode = "",
    learningPathId = 0,
  ): Promise<SurveyDetail> {
    try {
      const request = buildSurveyDetailRequest(
        context,
        surveyId,
        mode,
        invitationLpItemId,
        invitationCode,
        learningPathId,
      )
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

  buildSubmitRequest(
    context: CourseNavigationContext,
    detail: SurveyDetail,
    draft: SurveyAnswerDraft,
    invitationLpItemId = 0,
    learningPathId = 0,
  ): HttpRequest {
    const request = buildSurveySubmitRequest(
      context,
      detail.id,
      invitationLpItemId,
      detail.invitationCode,
      buildSurveySubmissionPayload(detail, draft),
      learningPathId,
    )

    return {
      method: "POST",
      path: request.path,
      query: request.query,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: request.body,
    }
  }

  async submitSurvey(
    context: CourseNavigationContext,
    detail: SurveyDetail,
    draft: SurveyAnswerDraft,
    invitationLpItemId = 0,
    learningPathId = 0,
  ): Promise<SurveyDetail> {
    try {
      const response = await this.httpClient.request<unknown>(
        this.buildSubmitRequest(
          context,
          detail,
          draft,
          invitationLpItemId,
          learningPathId,
        ),
      )

      return normalizeSurveyDetail(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
