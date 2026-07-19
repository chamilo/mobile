import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  buildForumCategoriesRequest,
  buildForumsRequest,
  buildForumThreadRequest,
  buildForumThreadsRequest,
  ForumContractError,
  normalizeForumCollection,
  normalizeForumThreadDetail,
  normalizeForumThreads,
} from "@/domain/forums/contracts"
import type {
  ForumCollection,
  ForumThreadDetail,
  ForumThreadsCollection,
} from "@/domain/forums/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type ForumErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
  | "contract_gap"

export class ForumServiceError extends Error {
  constructor(
    public readonly code: ForumErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "ForumServiceError"
  }
}

function mapError(error: unknown): ForumServiceError {
  if (error instanceof ForumContractError) {
    const code = error.message.includes("resource node") ? "contract_gap" : "invalid_response"
    return new ForumServiceError(code, error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new ForumServiceError("server", "The forum request failed.", error)
  }

  if (error.kind === "authentication") {
    return new ForumServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new ForumServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new ForumServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new ForumServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new ForumServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new ForumServiceError("not_found", error.message, error)
  }

  return new ForumServiceError("server", error.message, error)
}

function resourceNodeId(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const course = value as Record<string, unknown>
  const node = course.resourceNode

  if (!node || typeof node !== "object" || Array.isArray(node)) return null

  const id = (node as Record<string, unknown>).id
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null
}

export class ForumApiService {
  constructor(private readonly httpClient: HttpClient) {}

  private async getCourseResourceNodeId(context: CourseNavigationContext): Promise<number> {
    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: `/api/courses/${context.courseId}`,
      headers: {
        Accept: "application/ld+json",
        "Cache-Control": "no-store",
      },
    })

    const id = resourceNodeId(response.data)
    if (!id) {
      throw new ForumContractError("The course resource node is required for forums.")
    }

    return id
  }

  async getForums(context: CourseNavigationContext): Promise<ForumCollection> {
    try {
      const courseResourceNodeId = await this.getCourseResourceNodeId(context)
      const categoryRequest = buildForumCategoriesRequest(context, courseResourceNodeId)
      const forumRequest = buildForumsRequest(context, courseResourceNodeId)

      const [categoryResponse, forumResponse] = await Promise.all([
        this.httpClient.request<unknown>({
          method: "GET",
          path: categoryRequest.path,
          query: categoryRequest.query,
          headers: {
            Accept: "application/ld+json",
            "Cache-Control": "no-store",
          },
        }),
        this.httpClient.request<unknown>({
          method: "GET",
          path: forumRequest.path,
          query: forumRequest.query,
          headers: {
            Accept: "application/ld+json",
            "Cache-Control": "no-store",
          },
        }),
      ])

      return normalizeForumCollection(categoryResponse.data, forumResponse.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getThreads(
    context: CourseNavigationContext,
    forumId: number,
  ): Promise<ForumThreadsCollection> {
    try {
      const request = buildForumThreadsRequest(context, forumId)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
          "Cache-Control": "no-store",
        },
      })

      return normalizeForumThreads(response.data, forumId)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getThread(
    context: CourseNavigationContext,
    forumId: number,
    threadId: number,
  ): Promise<ForumThreadDetail> {
    try {
      const request = buildForumThreadRequest(context, forumId, threadId)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
      })

      return normalizeForumThreadDetail(response.data, forumId, threadId)
    } catch (error) {
      throw mapError(error)
    }
  }
}
