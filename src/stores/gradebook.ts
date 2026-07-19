import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { GradebookOverview } from "@/domain/gradebook/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  GradebookApiService,
  type GradebookErrorCode,
  GradebookServiceError,
} from "@/services/gradebook/GradebookApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

export type GradebookLoadStatus = "idle" | "loading" | "ready" | "error"
export type GradebookStoreErrorCode = GradebookErrorCode | "campus_required" | "profile_required"

interface GradebookState {
  status: GradebookLoadStatus
  data: GradebookOverview | null
  errorCode: GradebookStoreErrorCode | null
}

function initialState(): GradebookState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

export const useGradebookStore = defineStore("gradebook", () => {
  const state = reactive<GradebookState>(initialState())

  async function load(context: CourseNavigationContext): Promise<boolean> {
    const campus = useCampusStore().selectedCampus
    const user = useAuthStore().profile

    if (!campus) {
      state.status = "error"
      state.data = null
      state.errorCode = "campus_required"
      return false
    }

    if (!user) {
      state.status = "error"
      state.data = null
      state.errorCode = "profile_required"
      return false
    }

    state.status = "loading"
    state.data = null
    state.errorCode = null

    try {
      state.data = await new GradebookApiService(createAuthenticatedHttpClient(campus)).getOverview(
        context,
        user,
      )
      state.status = "ready"
      return true
    } catch (error) {
      state.errorCode = error instanceof GradebookServiceError ? error.code : "server"
      state.status = "error"
      return false
    }
  }

  function reset(): void {
    Object.assign(state, initialState())
  }

  return {
    state,
    load,
    reset,
  }
})
