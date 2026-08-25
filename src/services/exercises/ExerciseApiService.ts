import type { CourseNavigationContext } from "@/domain/courses/types"
import { buildExerciseLearningPathApiQuery } from "@/domain/exercises/learningPathContext"
import {
  normalizeExerciseAnswerResponse,
  normalizeExerciseAttempt,
  normalizeExerciseFinishResponse,
  normalizeExerciseList,
  normalizeExerciseResult,
  normalizeExerciseRuntime,
  ExerciseContractError,
} from "@/domain/exercises/contracts"
import type {
  ExerciseAnswerResponse,
  ExerciseAttempt,
  ExerciseFinishResponse,
  ExerciseLearningPathContext,
  ExerciseList,
  ExerciseResult,
  ExerciseRuntime,
} from "@/domain/exercises/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type ExerciseServiceErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "invalid_response"
  | "server"

export class ExerciseServiceError extends Error {
  constructor(
    public readonly code: ExerciseServiceErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "ExerciseServiceError"
  }
}

function contextQuery(
  context: CourseNavigationContext,
  learningPathContext?: ExerciseLearningPathContext | null,
): Record<string, string | number | boolean | null | undefined> {
  return {
    cid: context.courseId,
    sid: context.sessionId ?? 0,
    gid: 0,
    ...buildExerciseLearningPathApiQuery(learningPathContext),
  }
}

function mapError(error: unknown): ExerciseServiceError {
  if (error instanceof ExerciseContractError) {
    return new ExerciseServiceError("invalid_response", error.message, error)
  }
  if (!(error instanceof HttpClientError)) {
    return new ExerciseServiceError("server", "The exercise request failed.", error)
  }
  if (error.kind === "authentication") {
    return new ExerciseServiceError("session_required", error.message, error)
  }
  if (error.kind === "network") {
    return new ExerciseServiceError("network", error.message, error)
  }
  if (error.kind === "timeout") {
    return new ExerciseServiceError("timeout", error.message, error)
  }
  if (error.kind === "http" && error.status === 401) {
    return new ExerciseServiceError("session_expired", error.message, error)
  }
  if (error.kind === "http" && error.status === 403) {
    return new ExerciseServiceError("access_denied", error.message, error)
  }
  if (error.kind === "http" && error.status === 404) {
    return new ExerciseServiceError("not_found", error.message, error)
  }

  return new ExerciseServiceError("server", error.message, error)
}

const SELECTED_CAMPUS_PLACEHOLDER = "https://selected-campus.invalid/"

function exerciseAssetPath(value: string): string {
  const raw = value.trim()
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    throw new ExerciseContractError("The exercise asset URL is not relative to the selected campus.")
  }

  try {
    const base = new URL(SELECTED_CAMPUS_PLACEHOLDER)
    const resolved = new URL(raw, base)

    if (resolved.origin !== base.origin) {
      throw new ExerciseContractError("The exercise asset URL is not relative to the selected campus.")
    }

    return `${resolved.pathname}${resolved.search}`
  } catch (error) {
    if (error instanceof ExerciseContractError) throw error

    throw new ExerciseContractError("The exercise asset URL is invalid.")
  }
}

export class ExerciseApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<ExerciseList> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/exercise/list",
        query: contextQuery(context),
        headers: { Accept: "application/ld+json" },
      })
      return normalizeExerciseList(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getRuntime(
    context: CourseNavigationContext,
    exerciseId: number,
    learningPathContext?: ExerciseLearningPathContext | null,
  ): Promise<ExerciseRuntime> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: `/api/exercise/runtime/${exerciseId}`,
        query: contextQuery(context, learningPathContext),
        headers: { Accept: "application/ld+json" },
      })
      return normalizeExerciseRuntime(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getHotspotImage(imageUrl: string): Promise<Blob> {
    try {
      const response = await this.httpClient.request<Blob>({
        method: "GET",
        path: exerciseAssetPath(imageUrl),
        headers: { Accept: "image/*" },
        responseType: "blob",
        timeoutMs: 60_000,
      })

      if (!(response.data instanceof Blob)) {
        throw new ExerciseContractError("The exercise hotspot image response is invalid.")
      }

      return response.data
    } catch (error) {
      throw mapError(error)
    }
  }

  async startAttempt(
    context: CourseNavigationContext,
    exerciseId: number,
    learningPathContext?: ExerciseLearningPathContext | null,
  ): Promise<ExerciseAttempt> {
    try {
      const response = await this.httpClient.request<unknown, { exerciseId: number }>({
        method: "POST",
        path: `/api/exercise/runtime/${exerciseId}/attempt`,
        query: contextQuery(context, learningPathContext),
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/ld+json",
        },
        body: { exerciseId },
      })
      return normalizeExerciseAttempt(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async saveAnswer(
    context: CourseNavigationContext,
    exerciseId: number,
    attemptId: number,
    payload: {
      questionId: number
      answer: Record<string, unknown>
      reviewLater: boolean
      secondsSpent: number
      navigationAction: string
    },
    learningPathContext?: ExerciseLearningPathContext | null,
  ): Promise<ExerciseAnswerResponse> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "POST",
        path: `/api/exercise/runtime/${exerciseId}/attempt/${attemptId}/answer`,
        query: contextQuery(context, learningPathContext),
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/ld+json",
        },
        body: { exerciseId, attemptId, ...payload },
      })
      return normalizeExerciseAnswerResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async finishAttempt(
    context: CourseNavigationContext,
    exerciseId: number,
    attemptId: number,
    confirmedSavedAnswers: boolean,
    learningPathContext?: ExerciseLearningPathContext | null,
  ): Promise<ExerciseFinishResponse> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "POST",
        path: `/api/exercise/runtime/${exerciseId}/attempt/${attemptId}/finish`,
        query: contextQuery(context, learningPathContext),
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/ld+json",
        },
        body: { exerciseId, attemptId, confirmedSavedAnswers },
      })
      return normalizeExerciseFinishResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getResult(
    context: CourseNavigationContext,
    exerciseId: number,
    attemptId: number,
    learningPathContext?: ExerciseLearningPathContext | null,
  ): Promise<ExerciseResult> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: `/api/exercise/runtime/${exerciseId}/attempt/${attemptId}/result`,
        query: contextQuery(context, learningPathContext),
        headers: { Accept: "application/ld+json" },
      })
      return normalizeExerciseResult(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
