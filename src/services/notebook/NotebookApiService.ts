import { buildNotebookApiQuery } from "@/domain/notebook/context"
import {
  NotebookContractError,
  normalizeNotebookFormResponse,
  normalizeNotebookListResponse,
} from "@/domain/notebook/normalizers"
import type {
  NotebookFormSnapshot,
  NotebookListSnapshot,
  NotebookMutationInput,
} from "@/domain/notebook/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type NotebookErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class NotebookServiceError extends Error {
  constructor(
    public readonly code: NotebookErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "NotebookServiceError"
  }
}

function mapError(error: unknown): NotebookServiceError {
  if (error instanceof NotebookServiceError) return error
  if (error instanceof NotebookContractError)
    return new NotebookServiceError("invalid_response", error.message, error)
  if (!(error instanceof HttpClientError))
    return new NotebookServiceError("server", "Notebook request failed.", error)
  if (error.kind === "authentication")
    return new NotebookServiceError("session_required", error.message, error)
  if (error.kind === "network") return new NotebookServiceError("network", error.message, error)
  if (error.kind === "timeout") return new NotebookServiceError("timeout", error.message, error)
  if (error.kind === "http" && error.status === 401)
    return new NotebookServiceError("session_expired", error.message, error)
  if (error.kind === "http" && error.status === 403)
    return new NotebookServiceError("access_denied", error.message, error)
  if (error.kind === "http" && error.status === 404)
    return new NotebookServiceError("not_found", error.message, error)
  return new NotebookServiceError("server", error.message, error)
}

export class NotebookApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<NotebookListSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/notebook/list",
        query: buildNotebookApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })
      return normalizeNotebookListResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getForm(context: CourseNavigationContext, iid?: number): Promise<NotebookFormSnapshot> {
    try {
      const query = buildNotebookApiQuery(context)
      if (iid) query.id = iid
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/notebook/form",
        query,
        headers: { Accept: "application/ld+json" },
      })
      return normalizeNotebookFormResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async create(context: CourseNavigationContext, input: NotebookMutationInput): Promise<void> {
    await this.write("POST", "/api/notebook", context, input)
  }

  async update(
    context: CourseNavigationContext,
    iid: number,
    input: NotebookMutationInput,
  ): Promise<void> {
    await this.write("PUT", `/api/notebook/${iid}`, context, input)
  }

  async remove(context: CourseNavigationContext, iid: number): Promise<void> {
    try {
      await this.httpClient.request({
        method: "DELETE",
        path: `/api/notebook/${iid}`,
        query: buildNotebookApiQuery(context),
        headers: { Accept: "application/ld+json" },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  private async write(
    method: "POST" | "PUT",
    path: string,
    context: CourseNavigationContext,
    input: NotebookMutationInput,
  ): Promise<void> {
    try {
      await this.httpClient.request({
        method,
        path,
        query: buildNotebookApiQuery(context),
        body: input,
        headers: { Accept: "application/ld+json", "Content-Type": "application/ld+json" },
      })
    } catch (error) {
      throw mapError(error)
    }
  }
}
