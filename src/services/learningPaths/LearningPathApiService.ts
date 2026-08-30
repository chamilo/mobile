import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildLearningPathRuntimeActionRequest,
  buildLearningPathRuntimeRequest,
  buildLearningPathScormCommitRequest,
  buildLearningPathScormPackageRequest,
  LearningPathContractError,
  normalizeLearningPathRuntime,
} from "@/domain/learningPaths/contracts"
import type {
  LearningPathRuntime,
  LearningPathScormCommitPayload,
  LearningPathScormRuntime,
} from "@/domain/learningPaths/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type LearningPathErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "invalid_response"
  | "unsupported"
  | "conflict"
  | "server"

export class LearningPathServiceError extends Error {
  constructor(
    public readonly code: LearningPathErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "LearningPathServiceError"
  }
}

function mapError(error: unknown): LearningPathServiceError {
  if (error instanceof LearningPathContractError) {
    return new LearningPathServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new LearningPathServiceError("server", "The learning path request failed.", error)
  }

  if (error.kind === "authentication") {
    return new LearningPathServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new LearningPathServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new LearningPathServiceError("timeout", error.message, error)
  }

  if (error.kind === "unsupported") {
    return new LearningPathServiceError("unsupported", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new LearningPathServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new LearningPathServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new LearningPathServiceError("not_found", error.message, error)
  }

  if (error.kind === "http" && error.status === 409) {
    return new LearningPathServiceError("conflict", error.message, error)
  }

  return new LearningPathServiceError("server", error.message, error)
}

export class LearningPathApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getRuntime(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId?: number,
  ): Promise<LearningPathRuntime> {
    const request = buildLearningPathRuntimeRequest(context, learningPathId, itemId)

    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
        },
      })

      return normalizeLearningPathRuntime(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async openItem(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    actionToken: string,
    allowNewAttempt = false,
  ): Promise<void> {
    const request = buildLearningPathRuntimeActionRequest(context, learningPathId, "item")

    try {
      await this.httpClient.request<void, Record<string, unknown>>({
        method: "POST",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/json",
        },
        body: {
          itemId,
          allowNewAttempt,
          csrfToken: actionToken,
        },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  async sync(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    actionToken: string,
  ): Promise<void> {
    const request = buildLearningPathRuntimeActionRequest(context, learningPathId, "sync")

    try {
      await this.httpClient.request<void, Record<string, unknown>>({
        method: "POST",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/json",
        },
        body: {
          itemId,
          csrfToken: actionToken,
        },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  async restart(
    context: CourseNavigationContext,
    learningPathId: number,
    actionToken: string,
  ): Promise<void> {
    const request = buildLearningPathRuntimeActionRequest(context, learningPathId, "restart")

    try {
      await this.httpClient.request<void, Record<string, unknown>>({
        method: "POST",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/json",
        },
        body: {
          csrfToken: actionToken,
        },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  async getScormPackage(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<ArrayBuffer> {
    const request = buildLearningPathScormPackageRequest(context, learningPathId, itemId)

    try {
      const response = await this.httpClient.request<ArrayBuffer>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/zip",
        },
        responseType: "arraybuffer",
        timeoutMs: 600_000,
        affectsCampusReachability: false,
      })

      if (!(response.data instanceof ArrayBuffer)) {
        throw new LearningPathServiceError(
          "unsupported",
          "The current transport did not return a SCORM package.",
        )
      }

      return response.data
    } catch (error) {
      if (error instanceof LearningPathServiceError) {
        throw error
      }

      throw mapError(error)
    }
  }

  async commitScorm(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    runtime: LearningPathScormRuntime,
    actionToken: string,
    payload: LearningPathScormCommitPayload,
  ): Promise<void> {
    const request = buildLearningPathScormCommitRequest(context, learningPathId)

    try {
      await this.httpClient.request<void, Record<string, unknown>>({
        method: "POST",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/json",
        },
        body: {
          itemId,
          itemViewId: runtime.itemViewId,
          version: runtime.version,
          values: payload.values,
          changedKeys: payload.changedKeys,
          terminated: payload.terminated,
          reason: payload.reason,
          csrfToken: actionToken,
        },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  async getContent(path: string): Promise<Blob> {
    try {
      const response = await this.httpClient.request<Blob>({
        method: "GET",
        path,
        headers: {
          Accept: "*/*",
        },
        responseType: "blob",
        timeoutMs: 30_000,
      })

      if (!(response.data instanceof Blob)) {
        throw new LearningPathServiceError(
          "unsupported",
          "The current transport did not return a learning path document.",
        )
      }

      return response.data
    } catch (error) {
      if (error instanceof LearningPathServiceError) {
        throw error
      }

      throw mapError(error)
    }
  }
}
