import { computed, ref } from "vue"
import { defineStore } from "pinia"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
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
import { useCampusStore } from "@/stores/campus"

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
    try {
      if (form.value.iid) await api.update(context, form.value.iid, input, form.value.csrfToken)
      else await api.create(context, input, form.value.csrfToken)
      mutationStatus.value = "ready"
      return true
    } catch (error) {
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
    try {
      await api.remove(context, iid, latestForm.csrfToken)
      mutationStatus.value = "ready"
      return await loadList(context)
    } catch (error) {
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
