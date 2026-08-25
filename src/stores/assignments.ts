import { reactive } from "vue"
import { defineStore } from "pinia"

import type {
  AssignmentCollection,
  AssignmentDetail,
  AssignmentSubmissionDeleteInput,
  AssignmentSubmissionInput,
  AssignmentSubmissionResult,
  AssignmentSubmissionUpdateInput,
} from "@/domain/assignments/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  AssignmentApiService,
  type AssignmentErrorCode,
  AssignmentServiceError,
} from "@/services/assignments/AssignmentApiService"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import { offlineCoreFlowRepository } from "@/services/offline/OfflineCoreFlowRepository"
import {
  isOfflineNow,
  isUncertainDeliveryError,
  temporaryOfflineId,
} from "@/services/offline/OfflineWriteSupport"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type AssignmentLoadStatus = "idle" | "loading" | "ready" | "error"
export type AssignmentStoreErrorCode = AssignmentErrorCode | "campus_required"
export type AssignmentFileAction = "open" | "download"

interface AssignmentListState {
  status: AssignmentLoadStatus
  data: AssignmentCollection | null
  errorCode: AssignmentStoreErrorCode | null
}

interface AssignmentWriteState {
  status: AssignmentLoadStatus
  data: AssignmentSubmissionResult | null
  errorCode: AssignmentStoreErrorCode | null
}

interface AssignmentDetailState {
  status: AssignmentLoadStatus
  data: AssignmentDetail | null
  errorCode: AssignmentStoreErrorCode | null
}

interface AssignmentManagementState {
  status: AssignmentLoadStatus
  action: "update" | "delete" | null
  submissionId: number | null
  errorCode: AssignmentStoreErrorCode | null
}

interface AssignmentDeliveryState {
  status: AssignmentLoadStatus
  action: AssignmentFileAction | null
  key: string | null
  errorCode: AssignmentStoreErrorCode | null
}

function listInitialState(): AssignmentListState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function writeInitialState(): AssignmentWriteState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function detailInitialState(): AssignmentDetailState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function managementInitialState(): AssignmentManagementState {
  return {
    status: "idle",
    action: null,
    submissionId: null,
    errorCode: null,
  }
}

function deliveryInitialState(): AssignmentDeliveryState {
  return {
    status: "idle",
    action: null,
    key: null,
    errorCode: null,
  }
}

const blobPresenter = createDocumentBlobPresenter()

export const useAssignmentsStore = defineStore("assignments", () => {
  const list = reactive<AssignmentListState>(listInitialState())
  const detail = reactive<AssignmentDetailState>(detailInitialState())
  const write = reactive<AssignmentWriteState>(writeInitialState())
  const management = reactive<AssignmentManagementState>(managementInitialState())
  const delivery = reactive<AssignmentDeliveryState>(deliveryInitialState())

  function service(): AssignmentApiService | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    return new AssignmentApiService(createAuthenticatedHttpClient(campus))
  }

  function activeIdentity(): { campusId: string; userId: number } | null {
    const campus = useCampusStore().selectedCampus
    const userId = useAuthStore().profile?.id

    return campus && userId ? { campusId: campus.id, userId } : null
  }

  function shouldUsePreparedData(): boolean {
    return isOfflineNow() || !useConnectivityStore().campusAvailable
  }

  async function restorePreparedList(context: CourseNavigationContext): Promise<boolean> {
    const identity = activeIdentity()
    if (!identity) return false

    const prepared = await offlineCoreFlowRepository
      .loadAssignmentList(identity.campusId, identity.userId, context)
      .catch(() => null)

    if (!prepared) return false

    list.data = structuredClone(prepared)
    list.status = "ready"
    list.errorCode = null
    return true
  }

  async function restorePreparedDetail(
    context: CourseNavigationContext,
    assignmentId: number,
  ): Promise<boolean> {
    const identity = activeIdentity()
    if (!identity) return false

    const prepared = await offlineCoreFlowRepository
      .loadAssignmentDetail(identity.campusId, identity.userId, context, assignmentId)
      .catch(() => null)

    if (!prepared) return false

    detail.data = structuredClone(prepared)
    detail.status = "ready"
    detail.errorCode = null
    return true
  }

  async function queueWrite(input: {
    category: "assignment_submit" | "assignment_update" | "assignment_delete"
    request: import("@/services/http/HttpClient").HttpRequest
    description: string
    dedupeKey?: string
    uncertainDelivery?: boolean
  }): Promise<boolean> {
    return useOfflineSyncStore().enqueueHttpWrite(input)
  }

  async function loadAssignments(context: CourseNavigationContext): Promise<boolean> {
    const api = service()

    if (!api) {
      list.status = "error"
      list.data = null
      list.errorCode = "campus_required"
      return false
    }

    list.status = "loading"
    list.data = null
    list.errorCode = null

    try {
      if (shouldUsePreparedData() && (await restorePreparedList(context))) return true

      const loaded = await api.getAssignments(context)
      if (!useConnectivityStore().campusAvailable && (await restorePreparedList(context))) {
        return true
      }

      list.data = loaded
      list.status = "ready"
      const identity = activeIdentity()
      if (identity && list.data && useConnectivityStore().campusAvailable) {
        await offlineCoreFlowRepository
          .saveAssignmentList(identity.campusId, identity.userId, context, list.data)
          .catch(() => undefined)
      }
      return true
    } catch (error) {
      if (await restorePreparedList(context)) return true
      list.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      list.status = "error"
      return false
    }
  }

  async function loadAssignment(
    context: CourseNavigationContext,
    assignmentId: number,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      detail.status = "error"
      detail.data = null
      detail.errorCode = "campus_required"
      return false
    }

    detail.status = "loading"
    detail.data = null
    detail.errorCode = null

    try {
      if (shouldUsePreparedData() && (await restorePreparedDetail(context, assignmentId))) {
        return true
      }

      const loaded = await api.getAssignment(context, assignmentId)
      if (
        !useConnectivityStore().campusAvailable &&
        (await restorePreparedDetail(context, assignmentId))
      ) {
        return true
      }

      detail.data = loaded
      detail.status = "ready"
      const identity = activeIdentity()
      if (identity && detail.data && useConnectivityStore().campusAvailable) {
        await offlineCoreFlowRepository
          .saveAssignmentDetail(
            identity.campusId,
            identity.userId,
            context,
            assignmentId,
            detail.data,
          )
          .catch(() => undefined)
      }
      return true
    } catch (error) {
      if (await restorePreparedDetail(context, assignmentId)) return true
      detail.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      detail.status = "error"
      return false
    }
  }

  async function submit(input: AssignmentSubmissionInput): Promise<boolean> {
    const api = service()

    if (!api) {
      write.status = "error"
      write.data = null
      write.errorCode = "campus_required"
      return false
    }

    write.status = "loading"
    write.data = null
    write.errorCode = null

    const queueSubmission = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await queueWrite({
        category: "assignment_submit",
        description: input.title.trim() || "Assignment submission",
        dedupeKey: [
          "assignment",
          input.courseId,
          input.sessionId ?? 0,
          input.assignmentId,
          input.kind,
        ].join(":"),
        uncertainDelivery,
        request: {
          method: "POST",
          path: "/api/mobile_assignment_submissions",
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/json",
          },
          body: input,
          timeoutMs: 60_000,
        },
      })

      if (queued && !uncertainDelivery) {
        write.data = {
          id: temporaryOfflineId(),
          title: input.title.trim(),
          submittedAt: new Date().toISOString(),
          hasFile: input.kind === "file",
        }
        write.status = "ready"
      }

      return queued && !uncertainDelivery
    }

    if (shouldUsePreparedData()) return queueSubmission()

    try {
      write.data = await api.submit(input)
      write.status = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) {
        await queueSubmission(true)
      }
      write.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      write.status = "error"
      return false
    }
  }

  async function deliverFile(
    downloadUrl: string,
    fallbackFilename: string,
    action: AssignmentFileAction,
    key: string,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      delivery.status = "error"
      delivery.action = action
      delivery.key = key
      delivery.errorCode = "campus_required"
      return false
    }

    delivery.status = "loading"
    delivery.action = action
    delivery.key = key
    delivery.errorCode = null

    try {
      const file = await api.getFile(downloadUrl, fallbackFilename)

      if (action === "open") {
        await blobPresenter.open(file.blob, file.filename)
      } else {
        await blobPresenter.download(file.blob, file.filename)
      }

      delivery.status = "ready"
      delivery.errorCode = null
      return true
    } catch (error) {
      delivery.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      delivery.status = "error"
      return false
    }
  }

  async function openFile(
    downloadUrl: string,
    fallbackFilename: string,
    key: string,
  ): Promise<boolean> {
    return deliverFile(downloadUrl, fallbackFilename, "open", key)
  }

  async function downloadFile(
    downloadUrl: string,
    fallbackFilename: string,
    key: string,
  ): Promise<boolean> {
    return deliverFile(downloadUrl, fallbackFilename, "download", key)
  }

  async function updateSubmission(
    submissionId: number,
    input: AssignmentSubmissionUpdateInput,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      management.status = "error"
      management.action = "update"
      management.submissionId = submissionId
      management.errorCode = "campus_required"
      return false
    }

    management.status = "loading"
    management.action = "update"
    management.submissionId = submissionId
    management.errorCode = null

    const queueUpdate = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await queueWrite({
        category: "assignment_update",
        description: input.title.trim() || "Assignment submission update",
        dedupeKey: `submission:${submissionId}`,
        uncertainDelivery,
        request: {
          method: "PATCH",
          path: `/api/mobile_assignment_submissions/${submissionId}`,
          query: {
            cid: input.courseId,
            sessionId: input.sessionId,
            sid: input.sessionId,
          },
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/merge-patch+json",
          },
          body: input,
        },
      })
      if (queued && !uncertainDelivery) management.status = "ready"
      return queued && !uncertainDelivery
    }

    if (shouldUsePreparedData()) return queueUpdate()

    try {
      await api.updateSubmission(submissionId, input)
      management.status = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueUpdate(true)
      management.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      management.status = "error"
      return false
    }
  }

  async function deleteSubmission(input: AssignmentSubmissionDeleteInput): Promise<boolean> {
    const api = service()

    if (!api) {
      management.status = "error"
      management.action = "delete"
      management.submissionId = input.submissionId
      management.errorCode = "campus_required"
      return false
    }

    management.status = "loading"
    management.action = "delete"
    management.submissionId = input.submissionId
    management.errorCode = null

    const queueDelete = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await queueWrite({
        category: "assignment_delete",
        description: `Delete assignment submission ${input.submissionId}`,
        dedupeKey: `submission:${input.submissionId}`,
        uncertainDelivery,
        request: {
          method: "DELETE",
          path: `/api/mobile_assignment_submissions/${input.submissionId}`,
          query: {
            assignmentId: input.assignmentId,
            courseId: input.courseId,
            sessionId: input.sessionId,
          },
          headers: { Accept: "application/ld+json" },
        },
      })
      if (queued && !uncertainDelivery) management.status = "ready"
      return queued && !uncertainDelivery
    }

    if (shouldUsePreparedData()) return queueDelete()

    try {
      await api.deleteSubmission(input)
      management.status = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueDelete(true)
      management.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      management.status = "error"
      return false
    }
  }

  function resetManagement(): void {
    Object.assign(management, managementInitialState())
  }

  function resetDelivery(): void {
    Object.assign(delivery, deliveryInitialState())
  }

  function resetWrite(): void {
    Object.assign(write, writeInitialState())
  }

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(detail, detailInitialState())
    Object.assign(write, writeInitialState())
    Object.assign(management, managementInitialState())
    Object.assign(delivery, deliveryInitialState())
  }

  return {
    list,
    detail,
    write,
    management,
    delivery,
    loadAssignments,
    loadAssignment,
    submit,
    openFile,
    downloadFile,
    updateSubmission,
    deleteSubmission,
    resetWrite,
    resetManagement,
    resetDelivery,
    reset,
  }
})
