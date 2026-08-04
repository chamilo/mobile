import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  LearningPathRegularSyncPayload,
  OfflineHttpWritePayload,
  OfflineOperation,
  OfflineOperationState,
  OfflineSyncSummary,
  OfflineSyncTrigger,
} from "@/domain/offline/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import {
  LearningPathApiService,
  LearningPathServiceError,
} from "@/services/learningPaths/LearningPathApiService"
import type { OfflineOutboxRepository } from "@/services/offline/OfflineOutboxRepository"
import { buildSurveyDetailRequest, normalizeSurveyDetail } from "@/domain/surveys/contracts"

export interface SyncEngineResult {
  summary: OfflineSyncSummary
  operations: OfflineOperation[]
}

function nextState(error: unknown): { state: OfflineOperationState; code: string } {
  if (error instanceof LearningPathServiceError) {
    switch (error.code) {
      case "session_required":
      case "session_expired":
        return { state: "requires_login", code: error.code }
      case "conflict":
        return { state: "conflict", code: error.code }
      case "access_denied":
      case "not_found":
      case "invalid_response":
      case "unsupported":
        return { state: "failed_permanent", code: error.code }
      case "network":
      case "timeout":
      case "server":
        return { state: "unknown_delivery", code: error.code }
    }
  }

  if (error instanceof HttpClientError) {
    if (error.kind === "authentication" || (error.kind === "http" && error.status === 401)) {
      return { state: "requires_login", code: "session_required" }
    }

    if (error.kind === "http" && error.status === 409) {
      return { state: "conflict", code: "conflict" }
    }

    if (error.kind === "http" && [400, 403, 404, 410, 422].includes(error.status ?? 0)) {
      return {
        state: "failed_permanent",
        code: error.status === 403 ? "access_denied" : `http_${error.status ?? 0}`,
      }
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return { state: "unknown_delivery", code: error.kind }
    }

    return { state: "unknown_delivery", code: error.kind }
  }

  return { state: "unknown_delivery", code: "unexpected" }
}

function countState(operations: OfflineOperation[], state: OfflineOperationState): number {
  return operations.filter((operation) => operation.state === state).length
}

export type SyncHttpClientFactory = (campus: CampusProfile) => HttpClient

export class SyncEngine {
  constructor(
    private readonly repository: OfflineOutboxRepository,
    private readonly clientFactory: SyncHttpClientFactory = createAuthenticatedHttpClient,
  ) {}

  async run(
    campus: CampusProfile,
    userId: number,
    trigger: OfflineSyncTrigger,
  ): Promise<SyncEngineResult> {
    const startedAt = new Date().toISOString()
    const operations = await this.repository.list(campus.id, userId)
    const candidates = operations.filter(
      (operation) => operation.state === "pending" || operation.state === "retryable",
    )
    let synced = 0
    let attempted = 0

    for (const operation of candidates) {
      attempted += 1
      const syncingOperation: OfflineOperation = {
        ...operation,
        state: "syncing",
        updatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        attemptCount: operation.attemptCount + 1,
        errorCode: null,
      }
      await this.repository.put(syncingOperation)

      try {
        await this.process(campus, syncingOperation)
        await this.repository.remove(syncingOperation.id)
        synced += 1
      } catch (error) {
        const mapped = nextState(error)
        await this.repository.put({
          ...syncingOperation,
          state: mapped.state,
          updatedAt: new Date().toISOString(),
          errorCode: mapped.code,
        })
        break
      }
    }

    const remaining = await this.repository.list(campus.id, userId)
    const finishedAt = new Date().toISOString()

    return {
      operations: remaining,
      summary: {
        trigger,
        startedAt,
        finishedAt,
        attempted,
        synced,
        pending: countState(remaining, "pending"),
        retryable: countState(remaining, "retryable"),
        unknownDelivery: countState(remaining, "unknown_delivery"),
        requiresLogin: countState(remaining, "requires_login"),
        conflicts: countState(remaining, "conflict"),
        failedPermanent: countState(remaining, "failed_permanent"),
      },
    }
  }

  private async process(campus: CampusProfile, operation: OfflineOperation): Promise<void> {
    const client = this.clientFactory(campus)

    if (operation.type === "learning_path_regular_sync") {
      const payload = operation.payload as LearningPathRegularSyncPayload
      await new LearningPathApiService(client).sync(
        payload.context,
        payload.learningPathId,
        payload.itemId,
        payload.actionToken,
      )
      return
    }

    const payload = operation.payload as OfflineHttpWritePayload

    if (payload.category === "survey_answer_submit") {
      await this.processSurveySubmission(client, payload)
      return
    }

    await client.request({
      ...payload.request,
      body: structuredClone(payload.request.body),
    })
  }

  private async processSurveySubmission(
    client: HttpClient,
    payload: OfflineHttpWritePayload,
  ): Promise<void> {
    const clientState = payload.clientState as
      | {
          kind?: unknown
          context?: unknown
          surveyId?: unknown
          invitationLpItemId?: unknown
          invitationCode?: unknown
        }
      | undefined

    if (clientState?.kind !== "survey_answer_submit") {
      throw new HttpClientError("configuration", "The queued survey context is invalid.")
    }

    const surveyId = Number(clientState.surveyId)
    const invitationLpItemId = Number(clientState.invitationLpItemId ?? 0)
    const context = clientState.context as CourseNavigationContext | undefined
    const invitationCode =
      typeof clientState.invitationCode === "string" ? clientState.invitationCode : ""

    if (!context || !Number.isInteger(surveyId) || surveyId <= 0) {
      throw new HttpClientError("configuration", "The queued survey context is invalid.")
    }

    const detailRequest = buildSurveyDetailRequest(
      context,
      surveyId,
      "answer",
      invitationLpItemId,
      invitationCode,
    )
    const response = await client.request<unknown>({
      method: "GET",
      path: detailRequest.path,
      query: detailRequest.query,
      headers: { Accept: "application/json" },
    })

    if (response.headers["x-chamilo-offline-cache"] === "true") {
      throw new HttpClientError("network", "A live survey security token is required.")
    }

    const detail = normalizeSurveyDetail(response.data)
    if (detail.isAnswered && !detail.canSubmit) {
      throw new HttpClientError(
        "http",
        "The survey was answered before this offline submission.",
        409,
      )
    }
    if (!detail.canSubmit || !detail.csrfToken) {
      throw new HttpClientError("http", "The survey can no longer be submitted.", 409)
    }

    const body =
      payload.request.body && typeof payload.request.body === "object"
        ? { ...(payload.request.body as Record<string, unknown>), csrfToken: detail.csrfToken }
        : { csrfToken: detail.csrfToken }

    await client.request({
      ...payload.request,
      query: {
        ...payload.request.query,
        ...(detail.invitationCode ? { invitationCode: detail.invitationCode } : {}),
      },
      body,
    })
  }
}
