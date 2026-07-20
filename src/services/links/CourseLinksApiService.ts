import { buildLinksApiQuery } from "@/domain/links/context"
import { CourseLinksContractError, normalizeCourseLinksResponse } from "@/domain/links/normalizers"
import type { CourseLinksSnapshot } from "@/domain/links/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CourseLinksErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
  | "open_failed"

export class CourseLinksServiceError extends Error {
  constructor(
    public readonly code: CourseLinksErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseLinksServiceError"
  }
}

function mapError(error: unknown): CourseLinksServiceError {
  if (error instanceof CourseLinksContractError) {
    return new CourseLinksServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new CourseLinksServiceError("server", "Course links request failed.", error)
  }

  if (error.kind === "authentication") {
    return new CourseLinksServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new CourseLinksServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new CourseLinksServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new CourseLinksServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new CourseLinksServiceError("access_denied", error.message, error)
  }

  return new CourseLinksServiceError("server", error.message, error)
}

export class CourseLinksApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<CourseLinksSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/links",
        query: buildLinksApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })

      return normalizeCourseLinksResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
