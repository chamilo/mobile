import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CourseIntroductionErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "invalid_response"
  | "server"

export class CourseIntroductionServiceError extends Error {
  constructor(
    public readonly code: CourseIntroductionErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CourseIntroductionServiceError"
  }
}

function mapError(error: unknown): CourseIntroductionServiceError {
  if (error instanceof CourseIntroductionServiceError) return error

  if (!(error instanceof HttpClientError)) {
    return new CourseIntroductionServiceError(
      "server",
      "Course introduction request failed.",
      error,
    )
  }

  if (error.kind === "authentication") {
    return new CourseIntroductionServiceError("session_required", error.message, error)
  }
  if (error.kind === "network") {
    return new CourseIntroductionServiceError("network", error.message, error)
  }
  if (error.kind === "timeout") {
    return new CourseIntroductionServiceError("timeout", error.message, error)
  }
  if (error.kind === "http" && error.status === 401) {
    return new CourseIntroductionServiceError("session_expired", error.message, error)
  }
  if (error.kind === "http" && error.status === 403) {
    return new CourseIntroductionServiceError("access_denied", error.message, error)
  }

  return new CourseIntroductionServiceError("server", error.message, error)
}

function normalizeIntroduction(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CourseIntroductionServiceError(
      "invalid_response",
      "Course introduction response is invalid.",
    )
  }

  const introText = (value as Record<string, unknown>).introText

  if (typeof introText !== "string") {
    throw new CourseIntroductionServiceError(
      "invalid_response",
      "Course introduction text is missing.",
    )
  }

  return introText
}

export class CourseIntroductionApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getCurrent(context: CourseNavigationContext): Promise<string> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/c_tool_intros/current",
        query: {
          cid: context.courseId,
          sid: context.sessionId ?? undefined,
        },
        headers: { Accept: "application/ld+json" },
      })

      return normalizeIntroduction(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
