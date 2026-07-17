import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseDescriptionSnapshot } from "@/domain/courseDescription/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  CourseDescriptionApiService,
  CourseDescriptionServiceError,
  type CourseDescriptionErrorCode,
} from "@/services/courseDescription/CourseDescriptionApiService"
import { useCampusStore } from "@/stores/campus"

export type CourseDescriptionStatus = "idle" | "loading" | "ready" | "error"
export type CourseDescriptionStoreErrorCode = CourseDescriptionErrorCode | "campus_required"

type CourseDescriptionApi = Pick<CourseDescriptionApiService, "getList">
type CourseDescriptionApiFactory = (campus: CampusProfile) => CourseDescriptionApi

let apiFactory: CourseDescriptionApiFactory = (campus) =>
  new CourseDescriptionApiService(createAuthenticatedHttpClient(campus))

export function setCourseDescriptionApiFactoryForTests(factory: CourseDescriptionApiFactory): void {
  apiFactory = factory
}

export function resetCourseDescriptionApiFactory(): void {
  apiFactory = (campus) => new CourseDescriptionApiService(createAuthenticatedHttpClient(campus))
}

export const useCourseDescriptionStore = defineStore("courseDescription", () => {
  const status = ref<CourseDescriptionStatus>("idle")
  const snapshot = ref<CourseDescriptionSnapshot | null>(null)
  const errorCode = ref<CourseDescriptionStoreErrorCode | null>(null)

  const items = computed(() => snapshot.value?.items ?? [])

  async function load(context: CourseNavigationContext): Promise<boolean> {
    const campus = useCampusStore().selectedCampus

    if (!campus) {
      errorCode.value = "campus_required"
      status.value = "error"

      return false
    }

    status.value = "loading"
    errorCode.value = null

    try {
      snapshot.value = await apiFactory(campus).getList(context)
      status.value = "ready"

      return true
    } catch (error) {
      errorCode.value = error instanceof CourseDescriptionServiceError ? error.code : "server"
      status.value = "error"

      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    snapshot.value = null
    errorCode.value = null
  }

  return { status, snapshot, errorCode, items, load, reset }
})
