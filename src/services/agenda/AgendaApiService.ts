import { buildAgendaApiQuery } from "@/domain/agenda/context"
import { AgendaContractError, normalizeAgendaResponse } from "@/domain/agenda/normalizers"
import type { AgendaSnapshot } from "@/domain/agenda/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type AgendaErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class AgendaServiceError extends Error {
  constructor(
    public readonly code: AgendaErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "AgendaServiceError"
  }
}

function mapError(error: unknown): AgendaServiceError {
  if (error instanceof AgendaContractError) {
    return new AgendaServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new AgendaServiceError("server", "Agenda request failed.", error)
  }

  if (error.kind === "authentication") {
    return new AgendaServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new AgendaServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new AgendaServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new AgendaServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new AgendaServiceError("access_denied", error.message, error)
  }

  return new AgendaServiceError("server", error.message, error)
}

export class AgendaApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<AgendaSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/c_calendar_events",
        query: buildAgendaApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })

      return normalizeAgendaResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
