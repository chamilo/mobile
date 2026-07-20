import type { CurrentUserProfile } from "@/domain/auth/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildGradebookCertificatesRequest,
  buildGradebookSummaryRequest,
  GradebookContractError,
  normalizeGradebookOverview,
} from "@/domain/gradebook/contracts"
import type { GradebookOverview } from "@/domain/gradebook/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type GradebookErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class GradebookServiceError extends Error {
  constructor(
    public readonly code: GradebookErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "GradebookServiceError"
  }
}

function mapError(error: unknown): GradebookServiceError {
  if (error instanceof GradebookContractError) {
    return new GradebookServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new GradebookServiceError("server", "The gradebook request failed.", error)
  }

  if (error.kind === "authentication") {
    return new GradebookServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new GradebookServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new GradebookServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new GradebookServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new GradebookServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new GradebookServiceError("not_found", error.message, error)
  }

  return new GradebookServiceError("server", error.message, error)
}

export class GradebookApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getOverview(
    context: CourseNavigationContext,
    user: CurrentUserProfile,
  ): Promise<GradebookOverview> {
    try {
      const summaryRequest = buildGradebookSummaryRequest(context, user.id)
      const certificatesRequest = buildGradebookCertificatesRequest(context, user.id)

      const [summaryResponse, certificatesResponse] = await Promise.all([
        this.httpClient.request<unknown>({
          method: "GET",
          path: summaryRequest.path,
          query: summaryRequest.query,
          headers: {
            Accept: "application/ld+json",
          },
        }),
        this.httpClient.request<unknown>({
          method: "GET",
          path: certificatesRequest.path,
          query: certificatesRequest.query,
          headers: {
            Accept: "application/ld+json",
          },
        }),
      ])

      return normalizeGradebookOverview(summaryResponse.data, certificatesResponse.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
