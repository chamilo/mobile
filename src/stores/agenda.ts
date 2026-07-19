import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import { groupAgendaEvents } from "@/domain/agenda/presentation"
import type { AgendaSnapshot } from "@/domain/agenda/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  AgendaApiService,
  AgendaServiceError,
  type AgendaErrorCode,
} from "@/services/agenda/AgendaApiService"
import { useCampusStore } from "@/stores/campus"

export type AgendaStatus = "idle" | "loading" | "ready" | "error"
export type AgendaStoreErrorCode = AgendaErrorCode | "campus_required"

type AgendaApi = Pick<AgendaApiService, "getList">
type AgendaApiFactory = (campus: CampusProfile) => AgendaApi

let apiFactory: AgendaApiFactory = (campus) =>
  new AgendaApiService(createAuthenticatedHttpClient(campus))

export function setAgendaApiFactoryForTests(factory: AgendaApiFactory): void {
  apiFactory = factory
}

export function resetAgendaApiFactory(): void {
  apiFactory = (campus) => new AgendaApiService(createAuthenticatedHttpClient(campus))
}

export const useAgendaStore = defineStore("agenda", () => {
  const status = ref<AgendaStatus>("idle")
  const snapshot = ref<AgendaSnapshot | null>(null)
  const errorCode = ref<AgendaStoreErrorCode | null>(null)

  const groups = computed(() => groupAgendaEvents(snapshot.value?.items ?? []))

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
      errorCode.value = error instanceof AgendaServiceError ? error.code : "server"
      status.value = "error"
      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    snapshot.value = null
    errorCode.value = null
  }

  return { status, snapshot, errorCode, groups, load, reset }
})
