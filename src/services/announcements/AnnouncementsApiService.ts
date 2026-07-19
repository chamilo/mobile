import { buildAnnouncementApiQuery } from "@/domain/announcements/context"
import {
  AnnouncementContractError,
  normalizeAnnouncementDetailResponse,
  normalizeAnnouncementListResponse,
} from "@/domain/announcements/normalizers"
import type {
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
} from "@/domain/announcements/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type AnnouncementsErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class AnnouncementsServiceError extends Error {
  constructor(
    public readonly code: AnnouncementsErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "AnnouncementsServiceError"
  }
}

function mapServiceError(error: unknown): AnnouncementsServiceError {
  if (error instanceof AnnouncementsServiceError) {
    return error
  }

  if (error instanceof AnnouncementContractError) {
    return new AnnouncementsServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new AnnouncementsServiceError("server", "Announcements could not be loaded.", error)
  }

  if (error.kind === "authentication") {
    return new AnnouncementsServiceError("session_required", error.message, error)
  }

  if (error.kind === "timeout") {
    return new AnnouncementsServiceError("timeout", "The campus did not respond in time.", error)
  }

  if (error.kind === "network") {
    return new AnnouncementsServiceError("network", "The campus could not be reached.", error)
  }

  if (error.kind === "http") {
    if (error.status === 401) {
      return new AnnouncementsServiceError("session_expired", "The campus session expired.", error)
    }

    if (error.status === 403) {
      return new AnnouncementsServiceError(
        "access_denied",
        "Announcement access was denied.",
        error,
      )
    }

    if (error.status === 404) {
      return new AnnouncementsServiceError("not_found", "The announcement was not found.", error)
    }
  }

  return new AnnouncementsServiceError(
    "server",
    "The campus returned an announcements error.",
    error,
  )
}

export class AnnouncementsApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<AnnouncementListSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/announcement/list",
        query: buildAnnouncementApiQuery(context),
        headers: {
          Accept: "application/ld+json",
          "Cache-Control": "no-cache",
        },
      })

      return normalizeAnnouncementListResponse(response.data, context)
    } catch (error) {
      throw mapServiceError(error)
    }
  }

  async getDetail(
    context: CourseNavigationContext,
    announcementId: number,
  ): Promise<AnnouncementDetailSnapshot> {
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      throw new AnnouncementsServiceError(
        "invalid_response",
        "The announcement identity is invalid.",
      )
    }

    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: `/api/announcement/${announcementId}`,
        query: buildAnnouncementApiQuery(context),
        headers: {
          Accept: "application/ld+json",
          "Cache-Control": "no-cache",
        },
      })

      return normalizeAnnouncementDetailResponse(response.data, context, announcementId)
    } catch (error) {
      throw mapServiceError(error)
    }
  }
}
