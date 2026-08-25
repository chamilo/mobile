import type { CourseNavigationContext } from "@/domain/courses/types"
import { buildForumLearningPathApiQuery } from "@/domain/forums/learningPathContext"
import type { ForumLearningPathContext } from "@/domain/forums/learningPathContext"
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
  CreateForumReplyInput,
  CreateForumThreadInput,
  ForumActionToken,
  ForumCollection,
  ForumThreadDetail,
  ForumThreadsCollection,
  ForumWriteResult,
} from "@/domain/forums/types"
import type { HttpClient, HttpRequest } from "@/services/http/HttpClient"
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
  | "validation"

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

  if (error.kind === "http" && (error.status === 400 || error.status === 422)) {
    return new ForumServiceError("validation", error.message, error)
  }

  return new ForumServiceError("server", error.message, error)
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ForumContractError(`Invalid ${field}.`)
  }

  return parsed
}

function writeResult(value: unknown): ForumWriteResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ForumContractError("The forum write response is invalid.")
  }

  const record = value as Record<string, unknown>

  return {
    threadId: positiveInteger(record.threadId, "thread id"),
    postId: positiveInteger(record.postId, "post id"),
    requiresApproval: record.requiresApproval === true,
    message: typeof record.message === "string" ? record.message : "",
  }
}

function actionToken(value: unknown): ForumActionToken {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ForumContractError("The forum action token response is invalid.")
  }

  const token = (value as Record<string, unknown>).token

  if (typeof token !== "string" || !token.trim()) {
    throw new ForumContractError("The forum action token is missing.")
  }

  return { token }
}

function contextQuery(
  context: CourseNavigationContext,
  learningPathContext?: ForumLearningPathContext | null,
): Record<string, number> {
  return {
    cid: context.courseId,
    ...(context.sessionId ? { sid: context.sessionId } : {}),
    ...buildForumLearningPathApiQuery(learningPathContext),
  }
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
          },
        }),
        this.httpClient.request<unknown>({
          method: "GET",
          path: forumRequest.path,
          query: forumRequest.query,
          headers: {
            Accept: "application/ld+json",
          },
        }),
      ])

      const collection = normalizeForumCollection(categoryResponse.data, forumResponse.data)
      await this.getActionToken().catch(() => undefined)
      return collection
    } catch (error) {
      throw mapError(error)
    }
  }

  async getThreads(
    context: CourseNavigationContext,
    forumId: number,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumThreadsCollection> {
    try {
      const request = buildForumThreadsRequest(context, forumId, learningPathContext)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/ld+json",
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
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumThreadDetail> {
    try {
      const request = buildForumThreadRequest(context, forumId, threadId, learningPathContext)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/json",
        },
      })

      return normalizeForumThreadDetail(response.data, forumId, threadId)
    } catch (error) {
      throw mapError(error)
    }
  }
  async getActionToken(): Promise<ForumActionToken> {
    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: "/api/forum/action-token",
      headers: {
        Accept: "application/ld+json",
      },
    })

    return actionToken(response.data)
  }

  async prepareCreateThreadRequest(
    context: CourseNavigationContext,
    forumId: number,
    input: CreateForumThreadInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<HttpRequest<Record<string, unknown>>> {
    const token = await this.getActionToken()

    return {
      method: "POST",
      path: "/api/forum_threads/create",
      query: contextQuery(context, learningPathContext),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: {
        forumId: positiveInteger(forumId, "forum id"),
        title: input.title.trim(),
        text: input.text.trim(),
        postNotification: input.postNotification,
        threadSticky: false,
        csrfToken: token.token,
      },
    }
  }

  async prepareCreateReplyRequest(
    context: CourseNavigationContext,
    forumId: number,
    threadId: number,
    input: CreateForumReplyInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<HttpRequest<Record<string, unknown>>> {
    const token = await this.getActionToken()

    return {
      method: "POST",
      path: "/api/forum_posts/reply",
      query: contextQuery(context, learningPathContext),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: {
        forumId: positiveInteger(forumId, "forum id"),
        threadId: positiveInteger(threadId, "thread id"),
        ...(input.parentPostId
          ? { parentPostId: positiveInteger(input.parentPostId, "parent post id") }
          : {}),
        title: input.title.trim(),
        text: input.text.trim(),
        postNotification: input.postNotification,
        csrfToken: token.token,
      },
    }
  }

  async createThread(
    context: CourseNavigationContext,
    forumId: number,
    input: CreateForumThreadInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumWriteResult> {
    try {
      const response = await this.httpClient.request<unknown>(
        await this.prepareCreateThreadRequest(context, forumId, input, learningPathContext),
      )
      return writeResult(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async createReply(
    context: CourseNavigationContext,
    forumId: number,
    threadId: number,
    input: CreateForumReplyInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumWriteResult> {
    try {
      const response = await this.httpClient.request<unknown>(
        await this.prepareCreateReplyRequest(context, forumId, threadId, input, learningPathContext),
      )
      return writeResult(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
