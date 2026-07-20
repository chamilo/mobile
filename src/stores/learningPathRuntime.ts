import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { isOpenableLearningPathItem } from "@/domain/learningPaths/contracts"
import type { LearningPathRuntime } from "@/domain/learningPaths/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import {
  LearningPathApiService,
  LearningPathServiceError,
  type LearningPathErrorCode,
} from "@/services/learningPaths/LearningPathApiService"
import { useCampusStore } from "@/stores/campus"

export type LearningPathStatus = "idle" | "loading" | "ready" | "error"
export type LearningPathContentStatus = "idle" | "loading" | "error"
export type LearningPathStoreErrorCode = LearningPathErrorCode | "campus_required"

export const useLearningPathRuntimeStore = defineStore("learningPathRuntime", () => {
  const status = ref<LearningPathStatus>("idle")
  const contentStatus = ref<LearningPathContentStatus>("idle")
  const runtime = ref<LearningPathRuntime | null>(null)
  const errorCode = ref<LearningPathStoreErrorCode | null>(null)
  const contentErrorCode = ref<LearningPathStoreErrorCode | null>(null)

  const currentItem = computed(
    () => runtime.value?.items.find(({ id }) => id === runtime.value?.currentItemId) ?? null,
  )

  function service(): LearningPathApiService | null {
    const campus = useCampusStore().selectedCampus

    if (!campus) {
      errorCode.value = "campus_required"
      return null
    }

    return new LearningPathApiService(createAuthenticatedHttpClient(campus))
  }

  function mapError(error: unknown): LearningPathStoreErrorCode {
    return error instanceof LearningPathServiceError ? error.code : "server"
  }

  async function load(
    context: CourseNavigationContext,
    learningPathId: number,
    itemId?: number,
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      status.value = "error"
      return false
    }

    status.value = "loading"
    errorCode.value = null
    contentErrorCode.value = null

    try {
      runtime.value = await api.getRuntime(context, learningPathId, itemId)
      status.value = "ready"
      return true
    } catch (error) {
      errorCode.value = mapError(error)
      status.value = "error"
      return false
    }
  }

  async function openCurrentItem(): Promise<boolean> {
    const api = service()
    const currentRuntime = runtime.value
    const item = currentItem.value

    if (
      !api ||
      !currentRuntime ||
      !isOpenableLearningPathItem(item, currentRuntime) ||
      !currentRuntime.contentUrl
    ) {
      contentErrorCode.value = "unsupported"
      contentStatus.value = "error"
      return false
    }

    contentStatus.value = "loading"
    contentErrorCode.value = null

    try {
      const blob = await api.getContent(currentRuntime.contentUrl)
      await createDocumentBlobPresenter().open(blob, item?.title || "lesson")
      contentStatus.value = "idle"
      return true
    } catch (error) {
      contentErrorCode.value = mapError(error)
      contentStatus.value = "error"
      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    contentStatus.value = "idle"
    runtime.value = null
    errorCode.value = null
    contentErrorCode.value = null
  }

  return {
    status,
    contentStatus,
    runtime,
    errorCode,
    contentErrorCode,
    currentItem,
    load,
    openCurrentItem,
    reset,
  }
})
