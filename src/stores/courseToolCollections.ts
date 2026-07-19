import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { AcceleratedCourseToolKey, CourseToolCollection } from "@/domain/courseTools/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  CourseToolApiService,
  CourseToolServiceError,
  type CourseToolErrorCode,
} from "@/services/courseTools/CourseToolApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

export type CourseToolStatus = "idle" | "loading" | "ready" | "error"
export type CourseToolStoreErrorCode = CourseToolErrorCode | "campus_required" | "profile_required"

interface ToolState {
  status: CourseToolStatus
  collection: CourseToolCollection | null
  errorCode: CourseToolStoreErrorCode | null
}

function initialState(): ToolState {
  return {
    status: "idle",
    collection: null,
    errorCode: null,
  }
}

export const useCourseToolCollectionsStore = defineStore("courseToolCollections", () => {
  const states = reactive<Record<AcceleratedCourseToolKey, ToolState>>({
    "learning-paths": initialState(),
    exercises: initialState(),
  })

  async function load(
    tool: AcceleratedCourseToolKey,
    context: CourseNavigationContext,
  ): Promise<boolean> {
    const campus = useCampusStore().selectedCampus
    const user = useAuthStore().profile
    const state = states[tool]

    if (!campus) {
      state.status = "error"
      state.errorCode = "campus_required"
      return false
    }

    if (!user) {
      state.status = "error"
      state.errorCode = "profile_required"
      return false
    }

    state.status = "loading"
    state.errorCode = null

    try {
      state.collection = await new CourseToolApiService(
        createAuthenticatedHttpClient(campus),
      ).getCollection(tool, context, user)
      state.status = "ready"
      return true
    } catch (error) {
      state.errorCode = error instanceof CourseToolServiceError ? error.code : "server"
      state.status = "error"
      return false
    }
  }

  function reset(tool: AcceleratedCourseToolKey): void {
    Object.assign(states[tool], initialState())
  }

  return { states, load, reset }
})
