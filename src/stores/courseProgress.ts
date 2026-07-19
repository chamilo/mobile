import { computed, ref } from "vue"
import { defineStore } from "pinia"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { CourseProgressSnapshot } from "@/domain/courseProgress/types"
import {
  CourseProgressApiService,
  CourseProgressServiceError,
  type CourseProgressErrorCode,
} from "@/services/courseProgress/CourseProgressApiService"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { useCampusStore } from "@/stores/campus"
export type CourseProgressStatus = "idle" | "loading" | "ready" | "error"
export type CourseProgressStoreErrorCode = CourseProgressErrorCode | "campus_required"
type Api = Pick<CourseProgressApiService, "getList">
type Factory = (campus: CampusProfile) => Api
const factory: Factory = (campus) =>
  new CourseProgressApiService(createAuthenticatedHttpClient(campus))
export const useCourseProgressStore = defineStore("courseProgress", () => {
  const status = ref<CourseProgressStatus>("idle")
  const snapshot = ref<CourseProgressSnapshot | null>(null)
  const errorCode = ref<CourseProgressStoreErrorCode | null>(null)
  const items = computed(() => snapshot.value?.items ?? [])
  async function load(context: CourseNavigationContext) {
    const campus = useCampusStore().selectedCampus
    if (!campus) {
      errorCode.value = "campus_required"
      status.value = "error"
      return false
    }
    status.value = "loading"
    errorCode.value = null
    try {
      snapshot.value = await factory(campus).getList(context)
      status.value = "ready"
      return true
    } catch (error) {
      errorCode.value = error instanceof CourseProgressServiceError ? error.code : "server"
      status.value = "error"
      return false
    }
  }
  function reset() {
    status.value = "idle"
    snapshot.value = null
    errorCode.value = null
  }
  return { status, snapshot, errorCode, items, load, reset }
})
