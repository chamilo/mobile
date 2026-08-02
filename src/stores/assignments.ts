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
import { useCampusStore } from "@/stores/campus"

export type AssignmentLoadStatus = "idle" | "loading" | "ready" | "error"
export type AssignmentStoreErrorCode = AssignmentErrorCode | "campus_required"

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

export const useAssignmentsStore = defineStore("assignments", () => {
  const list = reactive<AssignmentListState>(listInitialState())
  const detail = reactive<AssignmentDetailState>(detailInitialState())
  const write = reactive<AssignmentWriteState>(writeInitialState())
  const management = reactive<AssignmentManagementState>(managementInitialState())

  function service(): AssignmentApiService | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    return new AssignmentApiService(createAuthenticatedHttpClient(campus))
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
      list.data = await api.getAssignments(context)
      list.status = "ready"
      return true
    } catch (error) {
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
      detail.data = await api.getAssignment(context, assignmentId)
      detail.status = "ready"
      return true
    } catch (error) {
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

    try {
      write.data = await api.submit(input)
      write.status = "ready"
      return true
    } catch (error) {
      write.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      write.status = "error"
      return false
    }
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

    try {
      await api.updateSubmission(submissionId, input)
      management.status = "ready"
      return true
    } catch (error) {
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

    try {
      await api.deleteSubmission(input)
      management.status = "ready"
      return true
    } catch (error) {
      management.errorCode = error instanceof AssignmentServiceError ? error.code : "server"
      management.status = "error"
      return false
    }
  }

  function resetManagement(): void {
    Object.assign(management, managementInitialState())
  }

  function resetWrite(): void {
    Object.assign(write, writeInitialState())
  }

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(detail, detailInitialState())
    Object.assign(write, writeInitialState())
    Object.assign(management, managementInitialState())
  }

  return {
    list,
    detail,
    write,
    management,
    loadAssignments,
    loadAssignment,
    submit,
    updateSubmission,
    deleteSubmission,
    resetWrite,
    resetManagement,
    reset,
  }
})
