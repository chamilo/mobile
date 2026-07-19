import { reactive } from "vue"
import { defineStore } from "pinia"

import type { AssignmentCollection, AssignmentDetail } from "@/domain/assignments/types"
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

interface AssignmentDetailState {
  status: AssignmentLoadStatus
  data: AssignmentDetail | null
  errorCode: AssignmentStoreErrorCode | null
}

function listInitialState(): AssignmentListState {
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

export const useAssignmentsStore = defineStore("assignments", () => {
  const list = reactive<AssignmentListState>(listInitialState())
  const detail = reactive<AssignmentDetailState>(detailInitialState())

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

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(detail, detailInitialState())
  }

  return {
    list,
    detail,
    loadAssignments,
    loadAssignment,
    reset,
  }
})
