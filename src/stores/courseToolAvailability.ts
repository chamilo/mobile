import { ref } from "vue"
import { defineStore } from "pinia"

import type { CourseHomeEntry, CourseToolKey } from "@/domain/courseHome/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  CourseToolAvailabilityApiService,
  CourseToolAvailabilityServiceError,
  type CourseToolAvailabilityErrorCode,
} from "@/services/courseHome/CourseToolAvailabilityApiService"
import { useCampusStore } from "@/stores/campus"

export type CourseToolAvailabilityStatus = "idle" | "loading" | "ready" | "error"
export type CourseToolAvailabilityStoreErrorCode =
  | CourseToolAvailabilityErrorCode
  | "campus_required"

export const useCourseToolAvailabilityStore = defineStore("courseToolAvailability", () => {
  const status = ref<CourseToolAvailabilityStatus>("idle")
  const tools = ref<CourseToolKey[]>([])
  const errorCode = ref<CourseToolAvailabilityStoreErrorCode | null>(null)
  const contextKey = ref<string | null>(null)

  function keyFor(entry: CourseHomeEntry): string {
    return [
      entry.context.courseId,
      entry.context.sessionId ?? 0,
      entry.context.source,
      entry.role,
    ].join(":")
  }

  async function load(entry: CourseHomeEntry, force = false): Promise<boolean> {
    const campus = useCampusStore().selectedCampus

    if (!campus) {
      status.value = "error"
      tools.value = []
      errorCode.value = "campus_required"
      return false
    }

    const nextContextKey = `${campus.id}:${keyFor(entry)}`

    if (!force && status.value === "ready" && contextKey.value === nextContextKey) {
      return true
    }

    status.value = "loading"
    tools.value = []
    errorCode.value = null
    contextKey.value = nextContextKey

    try {
      tools.value = await new CourseToolAvailabilityApiService(
        createAuthenticatedHttpClient(campus),
      ).getAvailableTools(entry.context, entry.role)
      status.value = "ready"
      return true
    } catch (error) {
      errorCode.value = error instanceof CourseToolAvailabilityServiceError ? error.code : "server"
      status.value = "error"
      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    tools.value = []
    errorCode.value = null
    contextKey.value = null
  }

  return {
    status,
    tools,
    errorCode,
    load,
    reset,
  }
})
