import { buildCourseDescriptionApiQuery } from "@/domain/courseDescription/context"
import {
  CourseDescriptionContractError,
  normalizeCourseDescriptionResponse,
} from "@/domain/courseDescription/normalizers"
import type { CourseDescriptionSnapshot } from "@/domain/courseDescription/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CourseDescriptionErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class CourseDescriptionServiceError extends Error {
  constructor(
    public readonly code: CourseDescriptionErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseDescriptionServiceError"
  }
}

function mapError(error: unknown): CourseDescriptionServiceError {
  if (error instanceof CourseDescriptionContractError) {
    return new CourseDescriptionServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new CourseDescriptionServiceError("server", "Course description request failed.", error)
  }

  if (error.kind === "authentication") {
    return new CourseDescriptionServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new CourseDescriptionServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new CourseDescriptionServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new CourseDescriptionServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new CourseDescriptionServiceError("access_denied", error.message, error)
  }

  return new CourseDescriptionServiceError("server", error.message, error)
}

export class CourseDescriptionApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<CourseDescriptionSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/course-description/list",
        query: buildCourseDescriptionApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })

      return normalizeCourseDescriptionResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
