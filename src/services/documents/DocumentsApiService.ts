import { buildDocumentDeliveryQuery, buildDocumentsApiQuery } from "@/domain/documents/context"
import { DocumentsContractError, normalizeDocumentsResponse } from "@/domain/documents/normalizers"
import type { CourseDocument, DocumentsSnapshot } from "@/domain/documents/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type DocumentsErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
  | "unsupported"

export class DocumentsServiceError extends Error {
  constructor(
    public readonly code: DocumentsErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "DocumentsServiceError"
  }
}

function mapError(error: unknown): DocumentsServiceError {
  if (error instanceof DocumentsContractError) {
    return new DocumentsServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new DocumentsServiceError("server", "Document request failed.", error)
  }

  if (error.kind === "authentication") {
    return new DocumentsServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new DocumentsServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new DocumentsServiceError("timeout", error.message, error)
  }

  if (error.kind === "unsupported") {
    return new DocumentsServiceError("unsupported", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new DocumentsServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new DocumentsServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new DocumentsServiceError("not_found", error.message, error)
  }

  return new DocumentsServiceError("server", error.message, error)
}

function mapDeliveryError(error: unknown): DocumentsServiceError {
  if (
    error instanceof HttpClientError &&
    error.kind === "http" &&
    (error.status === 404 || error.status === 500)
  ) {
    return new DocumentsServiceError(
      "not_found",
      "The document file is not available on the campus.",
      error,
    )
  }

  return mapError(error)
}

export class DocumentsApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(context: CourseNavigationContext): Promise<DocumentsSnapshot> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/documents",
        query: buildDocumentsApiQuery(context),
        headers: { Accept: "application/ld+json", "Cache-Control": "no-store" },
      })

      return normalizeDocumentsResponse(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getContent(context: CourseNavigationContext, item: CourseDocument): Promise<Blob> {
    return this.getBlob(context, item.contentUrl)
  }

  async getDownload(context: CourseNavigationContext, item: CourseDocument): Promise<Blob> {
    return this.getBlob(context, item.downloadUrl)
  }

  private async getBlob(context: CourseNavigationContext, path: string | null): Promise<Blob> {
    if (!path) {
      throw new DocumentsServiceError("not_found", "Document URL is not available.")
    }

    try {
      const response = await this.httpClient.request<Blob>({
        method: "GET",
        path,
        query: buildDocumentDeliveryQuery(context),
        headers: { Accept: "*/*", "Cache-Control": "no-store" },
        responseType: "blob",
        timeoutMs: 30_000,
      })

      if (!(response.data instanceof Blob)) {
        throw new DocumentsServiceError(
          "unsupported",
          "The current transport did not return a document blob.",
        )
      }

      return response.data
    } catch (error) {
      throw mapDeliveryError(error)
    }
  }
}
