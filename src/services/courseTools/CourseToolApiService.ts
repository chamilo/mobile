import type { CurrentUserProfile } from "@/domain/auth/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildCourseToolRequest,
  CourseToolContractError,
  normalizeCourseToolResponse,
} from "@/domain/courseTools/contracts"
import type { AcceleratedCourseToolKey, CourseToolCollection } from "@/domain/courseTools/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CourseToolErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
  | "contract_gap"

export class CourseToolServiceError extends Error {
  constructor(
    public readonly code: CourseToolErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseToolServiceError"
  }
}

function mapError(error: unknown): CourseToolServiceError {
  if (error instanceof CourseToolContractError) {
    const code = error.message.includes("resource node") ? "contract_gap" : "invalid_response"
    return new CourseToolServiceError(code, error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new CourseToolServiceError("server", "The course tool request failed.", error)
  }

  if (error.kind === "authentication") {
    return new CourseToolServiceError("session_required", error.message, error)
  }
  if (error.kind === "network") {
    return new CourseToolServiceError("network", error.message, error)
  }
  if (error.kind === "timeout") {
    return new CourseToolServiceError("timeout", error.message, error)
  }
  if (error.kind === "http" && error.status === 401) {
    return new CourseToolServiceError("session_expired", error.message, error)
  }
  if (error.kind === "http" && error.status === 403) {
    return new CourseToolServiceError("access_denied", error.message, error)
  }

  return new CourseToolServiceError("server", error.message, error)
}

function resourceNodeId(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const course = value as Record<string, unknown>
  const node = course.resourceNode

  if (!node || typeof node !== "object" || Array.isArray(node)) return null

  const id = (node as Record<string, unknown>).id
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null
}

export class CourseToolApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getCollection(
    tool: AcceleratedCourseToolKey,
    context: CourseNavigationContext,
    user: CurrentUserProfile,
  ): Promise<CourseToolCollection> {
    try {
      let courseResourceNodeId: number | null = null

      if (tool === "learning-paths") {
        const courseResponse = await this.httpClient.request<unknown>({
          method: "GET",
          path: `/api/courses/${context.courseId}`,
          headers: {
            Accept: "application/ld+json",
            "Cache-Control": "no-store",
          },
        })

        courseResourceNodeId = resourceNodeId(courseResponse.data)
      }

      const request = buildCourseToolRequest(tool, {
        course: context,
        user,
        courseResourceNodeId,
      })

      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: { Accept: "application/ld+json", "Cache-Control": "no-store" },
      })

      return normalizeCourseToolResponse(tool, response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
