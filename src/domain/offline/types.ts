import type { CurrentUserProfile } from "@/domain/auth/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { HttpMethod, HttpResponseType } from "@/services/http/HttpClient"

export type CampusReachability = "unknown" | "reachable" | "unreachable"

export type OfflineWriteCategory =
  | "learning_path_regular_sync"
  | "learning_path_scorm_commit"
  | "exercise_answer"
  | "exercise_finish"
  | "assignment_submit"
  | "assignment_update"
  | "assignment_delete"
  | "forum_thread_create"
  | "forum_reply_create"
  | "message_send"
  | "message_read"
  | "message_star"
  | "message_delete"
  | "notebook_create"
  | "notebook_update"
  | "notebook_delete"
  | "survey_answer_submit"

export type OfflineOperationType = "learning_path_regular_sync" | "http_write"

export type OfflineOperationState =
  | "pending"
  | "syncing"
  | "retryable"
  | "unknown_delivery"
  | "requires_login"
  | "conflict"
  | "failed_permanent"

export type OfflineSyncTrigger = "manual" | "connectivity" | "foreground" | "session"

export interface LearningPathRegularSyncPayload {
  context: CourseNavigationContext
  learningPathId: number
  itemId: number
  actionToken: string
}

export interface OfflineSerializedHttpRequest {
  method: Exclude<HttpMethod, "GET">
  path: string
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  timeoutMs?: number
  responseType?: HttpResponseType
}

export interface OfflineHttpWritePayload {
  category: OfflineWriteCategory
  request: OfflineSerializedHttpRequest
  description: string
  clientState?: unknown
}

export interface OfflineOperationPayloadMap {
  learning_path_regular_sync: LearningPathRegularSyncPayload
  http_write: OfflineHttpWritePayload
}

export interface OfflineOperation<TType extends OfflineOperationType = OfflineOperationType> {
  id: string
  campusId: string
  userId: number
  namespace: string
  type: TType
  state: OfflineOperationState
  payload: OfflineOperationPayloadMap[TType]
  createdAt: string
  updatedAt: string
  lastAttemptAt: string | null
  attemptCount: number
  errorCode: string | null
}

export interface OfflineSyncSummary {
  trigger: OfflineSyncTrigger
  startedAt: string
  finishedAt: string
  attempted: number
  synced: number
  pending: number
  retryable: number
  unknownDelivery: number
  requiresLogin: number
  conflicts: number
  failedPermanent: number
}

export interface OfflineProfileRecord {
  version: 1
  key: string
  campusId: string
  userId: number
  savedAt: string
  profile: CurrentUserProfile
}

export interface OfflineSnapshotRecord<TData = unknown> {
  version: 1
  key: string
  campusId: string
  userId: number
  namespace: string
  snapshotKey: string
  savedAt: string
  data: TData
}
