import { computed, ref } from "vue"
import { defineStore } from "pinia"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { buildNotebookApiQuery } from "@/domain/notebook/context"
import type {
  NotebookFormSnapshot,
  NotebookListSnapshot,
  NotebookMutationInput,
} from "@/domain/notebook/types"
import {
  NotebookApiService,
  NotebookServiceError,
  type NotebookErrorCode,
} from "@/services/notebook/NotebookApiService"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { isOfflineNow, isUncertainDeliveryError } from "@/services/offline/OfflineWriteSupport"
import { useCampusStore } from "@/stores/campus"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type NotebookStatus = "idle" | "loading" | "ready" | "error"
export type NotebookStoreErrorCode = NotebookErrorCode | "campus_required" | "validation"
export type NotebookApi = Pick<
  NotebookApiService,
  "getList" | "getForm" | "create" | "update" | "remove"
>
export type NotebookApiFactory = (campus: CampusProfile) => NotebookApi

let apiFactory: NotebookApiFactory = (campus) =>
  new NotebookApiService(createAuthenticatedHttpClient(campus))
export function setNotebookApiFactoryForTests(factory: NotebookApiFactory): void {
  apiFactory = factory
}
export function resetNotebookApiFactory(): void {
  apiFactory = (campus) => new NotebookApiService(createAuthenticatedHttpClient(campus))
}

export const useNotebookStore = defineStore("notebook", () => {
  const listStatus = ref<NotebookStatus>("idle")
  const formStatus = ref<NotebookStatus>("idle")
  const mutationStatus = ref<NotebookStatus>("idle")
  const list = ref<NotebookListSnapshot | null>(null)
  const form = ref<NotebookFormSnapshot | null>(null)
  const errorCode = ref<NotebookStoreErrorCode | null>(null)

  const items = computed(() => list.value?.items ?? [])
  const canWrite = computed(() => list.value?.canWrite === true)

  function service(): NotebookApi | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) {
      errorCode.value = "campus_required"
      return null
    }
    return apiFactory(campus)
  }
  function mapError(error: unknown): NotebookStoreErrorCode {
    return error instanceof NotebookServiceError ? error.code : "server"
  }
  async function loadList(context: CourseNavigationContext): Promise<boolean> {
    const api = service()
    if (!api) {
      listStatus.value = "error"
      return false
    }
    listStatus.value = "loading"
    errorCode.value = null
    try {
      list.value = await api.getList(context)
      listStatus.value = "ready"
      return true
    } catch (error) {
      errorCode.value = mapError(error)
      listStatus.value = "error"
      return false
    }
  }
  async function loadForm(context: CourseNavigationContext, iid?: number): Promise<boolean> {
    const api = service()
    if (!api) {
      formStatus.value = "error"
      return false
    }
    formStatus.value = "loading"
    errorCode.value = null
    try {
      form.value = await api.getForm(context, iid)
      formStatus.value = "ready"
      return true
    } catch (error) {
      errorCode.value = mapError(error)
      formStatus.value = "error"
      return false
    }
  }
  async function save(
    context: CourseNavigationContext,
    input: NotebookMutationInput,
  ): Promise<boolean> {
    const api = service()
    if (!api || !form.value?.canWrite || !form.value.csrfToken) {
      errorCode.value = "access_denied"
      return false
    }
    if (!input.title.trim()) {
      errorCode.value = "validation"
      return false
    }
    mutationStatus.value = "loading"
    errorCode.value = null
    const activeForm = form.value
    const csrfToken = activeForm.csrfToken as string
    const queueSave = async (uncertainDelivery = false): Promise<boolean> => {
      const isUpdate = activeForm.iid !== null
      const queued = await useOfflineSyncStore().enqueueHttpWrite({
        category: isUpdate ? "notebook_update" : "notebook_create",
        description: input.title.trim(),
        dedupeKey: isUpdate ? `notebook:${activeForm.iid}` : undefined,
        uncertainDelivery,
        request: {
          method: isUpdate ? "PUT" : "POST",
          path: isUpdate ? `/api/notebook/${activeForm.iid}` : "/api/notebook",
          query: buildNotebookApiQuery(context),
          body: { ...input, csrfToken },
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
        },
      })
      if (queued && !uncertainDelivery) mutationStatus.value = "ready"
      return queued && !uncertainDelivery
    }

    if (isOfflineNow()) return queueSave()

    try {
      if (activeForm.iid) await api.update(context, activeForm.iid, input, csrfToken)
      else await api.create(context, input, csrfToken)
      mutationStatus.value = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueSave(true)
      errorCode.value = mapError(error)
      mutationStatus.value = "error"
      return false
    }
  }
  async function remove(context: CourseNavigationContext, iid: number): Promise<boolean> {
    const api = service()
    if (!api) return false
    const latestForm = await api.getForm(context, iid)
    if (!latestForm.canWrite || !latestForm.csrfToken) {
      errorCode.value = "access_denied"
      return false
    }
    mutationStatus.value = "loading"
    const csrfToken = latestForm.csrfToken as string
    const queueRemove = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await useOfflineSyncStore().enqueueHttpWrite({
        category: "notebook_delete",
        description: `Delete notebook ${iid}`,
        dedupeKey: `notebook:${iid}:delete`,
        uncertainDelivery,
        request: {
          method: "DELETE",
          path: `/api/notebook/${iid}`,
          query: buildNotebookApiQuery(context),
          body: { csrfToken },
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
        },
      })
      if (queued && !uncertainDelivery) {
        if (list.value) {
          list.value = {
            ...list.value,
            items: list.value.items.filter((item) => item.iid !== iid),
            totalItems: Math.max(0, list.value.totalItems - 1),
          }
        }
        mutationStatus.value = "ready"
      }
      return queued && !uncertainDelivery
    }

    if (isOfflineNow()) return queueRemove()

    try {
      await api.remove(context, iid, csrfToken)
      mutationStatus.value = "ready"
      return await loadList(context)
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueRemove(true)
      errorCode.value = mapError(error)
      mutationStatus.value = "error"
      return false
    }
  }
  function reset(): void {
    listStatus.value = "idle"
    formStatus.value = "idle"
    mutationStatus.value = "idle"
    list.value = null
    form.value = null
    errorCode.value = null
  }
  return {
    listStatus,
    formStatus,
    mutationStatus,
    list,
    form,
    errorCode,
    items,
    canWrite,
    loadList,
    loadForm,
    save,
    remove,
    reset,
  }
})
