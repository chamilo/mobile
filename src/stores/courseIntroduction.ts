import { ref } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  CourseIntroductionApiService,
  CourseIntroductionServiceError,
  type CourseIntroductionErrorCode,
} from "@/services/courseIntroduction/CourseIntroductionApiService"
import { useCampusStore } from "@/stores/campus"

export type CourseIntroductionStatus = "idle" | "loading" | "ready" | "error"
export type CourseIntroductionStoreErrorCode = CourseIntroductionErrorCode | "campus_required"

export const useCourseIntroductionStore = defineStore("courseIntroduction", () => {
  const status = ref<CourseIntroductionStatus>("idle")
  const introText = ref("")
  const errorCode = ref<CourseIntroductionStoreErrorCode | null>(null)
  const contextKey = ref<string | null>(null)

  function keyFor(context: CourseNavigationContext): string {
    return `${context.courseId}:${context.sessionId ?? 0}`
  }

  async function load(context: CourseNavigationContext, force = false): Promise<boolean> {
    const campus = useCampusStore().selectedCampus
    const nextKey = keyFor(context)

    if (!campus) {
      status.value = "error"
      introText.value = ""
      errorCode.value = "campus_required"
      contextKey.value = null
      return false
    }

    if (!force && status.value === "ready" && contextKey.value === nextKey) {
      return true
    }

    status.value = "loading"
    introText.value = ""
    errorCode.value = null
    contextKey.value = nextKey

    try {
      introText.value = await new CourseIntroductionApiService(
        createAuthenticatedHttpClient(campus),
      ).getCurrent(context)
      status.value = "ready"
      return true
    } catch (error) {
      status.value = "error"
      introText.value = ""
      errorCode.value = error instanceof CourseIntroductionServiceError ? error.code : "server"
      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    introText.value = ""
    errorCode.value = null
    contextKey.value = null
  }

  return { status, introText, errorCode, load, reset }
})
