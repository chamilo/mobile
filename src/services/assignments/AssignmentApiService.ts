import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  AssignmentContractError,
  buildAssignmentCommentsRequest,
  buildAssignmentRequest,
  buildAssignmentsRequest,
  buildAssignmentSubmissionsRequest,
  normalizeAssignmentCollection,
  normalizeAssignmentComments,
  normalizeAssignmentDetail,
} from "@/domain/assignments/contracts"
import type {
  AssignmentCollection,
  AssignmentComment,
  AssignmentDetail,
} from "@/domain/assignments/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type AssignmentErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"

export class AssignmentServiceError extends Error {
  constructor(
    public readonly code: AssignmentErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "AssignmentServiceError"
  }
}

function mapError(error: unknown): AssignmentServiceError {
  if (error instanceof AssignmentContractError) {
    return new AssignmentServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new AssignmentServiceError("server", "The assignment request failed.", error)
  }

  if (error.kind === "authentication") {
    return new AssignmentServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new AssignmentServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new AssignmentServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new AssignmentServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new AssignmentServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new AssignmentServiceError("not_found", error.message, error)
  }

  return new AssignmentServiceError("server", error.message, error)
}

function collectionMembers(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  if (!value || typeof value !== "object") return []

  const record = value as Record<string, unknown>

  if (Array.isArray(record["hydra:member"])) return record["hydra:member"]
  if (Array.isArray(record.member)) return record.member
  if (Array.isArray(record.items)) return record.items

  return []
}

function submissionId(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const raw = record.iid

  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw
  if (typeof raw === "string" && /^\d+$/.test(raw) && Number(raw) > 0) {
    return Number(raw)
  }

  return null
}

export class AssignmentApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getAssignments(context: CourseNavigationContext): Promise<AssignmentCollection> {
    try {
      const request = buildAssignmentsRequest(context)
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: request.path,
        query: request.query,
        headers: {
          Accept: "application/json",
        },
      })

      return normalizeAssignmentCollection(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getAssignment(
    context: CourseNavigationContext,
    assignmentId: number,
  ): Promise<AssignmentDetail> {
    try {
      const assignmentRequest = buildAssignmentRequest(context, assignmentId)
      const submissionsRequest = buildAssignmentSubmissionsRequest(context, assignmentId)

      const [assignmentResponse, submissionsResponse] = await Promise.all([
        this.httpClient.request<unknown>({
          method: "GET",
          path: assignmentRequest.path,
          query: assignmentRequest.query,
          headers: {
            Accept: "application/ld+json",
          },
        }),
        this.httpClient.request<unknown>({
          method: "GET",
          path: submissionsRequest.path,
          query: submissionsRequest.query,
          headers: {
            Accept: "application/json",
          },
        }),
      ])

      const commentsBySubmissionId = new Map<number, AssignmentComment[]>()

      await Promise.all(
        collectionMembers(submissionsResponse.data).map(async (submission) => {
          const id = submissionId(submission)
          if (id === null) return

          const commentsRequest = buildAssignmentCommentsRequest(context, id)
          const commentsResponse = await this.httpClient.request<unknown>({
            method: "GET",
            path: commentsRequest.path,
            query: commentsRequest.query,
            headers: {
              Accept: "application/ld+json",
            },
          })

          commentsBySubmissionId.set(id, normalizeAssignmentComments(commentsResponse.data))
        }),
      )

      return normalizeAssignmentDetail(
        assignmentResponse.data,
        submissionsResponse.data,
        commentsBySubmissionId,
      )
    } catch (error) {
      throw mapError(error)
    }
  }
}
