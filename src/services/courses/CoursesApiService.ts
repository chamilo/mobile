import {
  CourseContractError,
  normalizeCourseSession,
  normalizeDirectCourseEnrollment,
  normalizeHydraCollection,
} from "@/domain/courses/normalizers"
import type {
  CourseSession,
  CoursesOverview,
  HydraCollection,
  SessionPeriod,
} from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type CoursesErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class CoursesServiceError extends Error {
  constructor(
    public readonly code: CoursesErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "CoursesServiceError"
  }
}

function mapServiceError(error: unknown): CoursesServiceError {
  if (error instanceof CoursesServiceError) {
    return error
  }

  if (error instanceof CourseContractError) {
    return new CoursesServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new CoursesServiceError("server", "Courses could not be loaded.", error)
  }

  if (error.kind === "authentication") {
    return new CoursesServiceError("session_required", error.message, error)
  }

  if (error.kind === "timeout") {
    return new CoursesServiceError("timeout", "The campus did not respond in time.", error)
  }

  if (error.kind === "network") {
    return new CoursesServiceError("network", "The campus could not be reached.", error)
  }

  if (error.kind === "http") {
    if (error.status === 401) {
      return new CoursesServiceError("session_expired", "The campus session expired.", error)
    }

    if (error.status === 403) {
      return new CoursesServiceError("access_denied", "Course access was denied.", error)
    }
  }

  return new CoursesServiceError("server", "The campus returned a courses error.", error)
}

function normalizeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("//")) {
    throw new CourseContractError("The campus returned an unsafe pagination link.")
  }

  if (!value.startsWith("/")) {
    throw new CourseContractError("The campus returned an invalid pagination link.")
  }

  return value
}

export class CoursesApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getOverview(userId: number): Promise<CoursesOverview> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new CoursesServiceError("invalid_response", "The current user identity is invalid.")
    }

    try {
      const [directItems, currentItems, upcomingItems, pastItems] = await Promise.all([
        this.fetchAllPages<unknown>("/api/me/courses?itemsPerPage=50"),
        this.fetchAllPages<unknown>(
          `/api/users/${userId}/session_subscriptions/current?itemsPerPage=50`,
        ),
        this.fetchAllPages<unknown>(
          `/api/users/${userId}/session_subscriptions/upcoming?itemsPerPage=50`,
        ),
        this.fetchAllPages<unknown>(`/api/users/${userId}/session_subscriptions/past`),
      ])

      return {
        directCourses: directItems.map(normalizeDirectCourseEnrollment),
        currentSessions: this.normalizeSessions(currentItems, "current"),
        upcomingSessions: this.normalizeSessions(upcomingItems, "upcoming"),
        pastSessions: this.normalizeSessions(pastItems, "past"),
        fetchedAt: new Date().toISOString(),
      }
    } catch (error) {
      throw mapServiceError(error)
    }
  }

  private normalizeSessions(items: unknown[], period: SessionPeriod): CourseSession[] {
    return items.map((session) => normalizeCourseSession(session, period))
  }

  private async fetchAllPages<TItem>(initialPath: string): Promise<TItem[]> {
    const items: TItem[] = []
    const visited = new Set<string>()
    let path: string | null = initialPath

    while (path) {
      if (visited.has(path) || visited.size >= 100) {
        throw new CourseContractError("The campus pagination sequence is invalid.")
      }

      visited.add(path)

      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path,
        headers: {
          Accept: "application/ld+json",
        },
      })
      const collection: HydraCollection<TItem> = normalizeHydraCollection<TItem>(response.data)

      items.push(...collection["hydra:member"])
      path = normalizeNextPath(collection["hydra:view"]?.["hydra:next"])
    }

    return items
  }
}
