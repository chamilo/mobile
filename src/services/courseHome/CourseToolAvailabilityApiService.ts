import type { CourseRole, CourseNavigationContext } from "@/domain/courses/types"
import {
  buildCourseToolAvailabilityRequest,
  CourseToolAvailabilityContractError,
  normalizeAvailableCourseTools,
} from "@/domain/courseHome/courseToolAvailability"
import type { CourseToolKey } from "@/domain/courseHome/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CourseToolAvailabilityErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "invalid_response"
  | "server"

export class CourseToolAvailabilityServiceError extends Error {
  constructor(
    public readonly code: CourseToolAvailabilityErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseToolAvailabilityServiceError"
  }
}

function mapError(error: unknown): CourseToolAvailabilityServiceError {
  if (error instanceof CourseToolAvailabilityContractError) {
    return new CourseToolAvailabilityServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new CourseToolAvailabilityServiceError(
      "server",
      "The course tools request failed.",
      error,
    )
  }

  if (error.kind === "authentication") {
    return new CourseToolAvailabilityServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new CourseToolAvailabilityServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new CourseToolAvailabilityServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new CourseToolAvailabilityServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new CourseToolAvailabilityServiceError("access_denied", error.message, error)
  }

  return new CourseToolAvailabilityServiceError("server", error.message, error)
}

export class CourseToolAvailabilityApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getAvailableTools(
    context: CourseNavigationContext,
    role: CourseRole,
  ): Promise<CourseToolKey[]> {
    const request = buildCourseToolAvailabilityRequest(context)

    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
        },
      })

      return normalizeAvailableCourseTools(response.data, role)
    } catch (error) {
      throw mapError(error)
    }
  }
}
