import { buildCourseProgressApiQuery } from "@/domain/courseProgress/context"
import {
  CourseProgressContractError,
  normalizeCourseProgressResponse,
} from "@/domain/courseProgress/normalizers"
import type { CourseProgressSnapshot } from "@/domain/courseProgress/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
export type CourseProgressErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
export class CourseProgressServiceError extends Error {
  constructor(
    public readonly code: CourseProgressErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseProgressServiceError"
  }
}
function mapError(error: unknown) {
  if (error instanceof CourseProgressContractError)
    return new CourseProgressServiceError("invalid_response", error.message, error)
  if (!(error instanceof HttpClientError))
    return new CourseProgressServiceError("server", "Course progress request failed.", error)
  if (error.kind === "authentication")
    return new CourseProgressServiceError("session_required", error.message, error)
  if (error.kind === "network")
    return new CourseProgressServiceError("network", error.message, error)
  if (error.kind === "timeout")
    return new CourseProgressServiceError("timeout", error.message, error)
  if (error.kind === "http" && error.status === 401)
    return new CourseProgressServiceError("session_expired", error.message, error)
  if (error.kind === "http" && error.status === 403)
    return new CourseProgressServiceError("access_denied", error.message, error)
  return new CourseProgressServiceError("server", error.message, error)
}
export class CourseProgressApiService {
  constructor(private readonly httpClient: HttpClient) {}
  async getList(context: CourseNavigationContext): Promise<CourseProgressSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/course-progress/list",
        query: buildCourseProgressApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })
      return normalizeCourseProgressResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
