import { ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { CourseLink, CourseLinksSnapshot } from "@/domain/links/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  CourseLinksApiService,
  CourseLinksServiceError,
  type CourseLinksErrorCode,
} from "@/services/links/CourseLinksApiService"
import {
  BrowserExternalLinkPresenter,
  type ExternalLinkPresenter,
} from "@/services/links/ExternalLinkPresenter"
import { useCampusStore } from "@/stores/campus"

export type CourseLinksStatus = "idle" | "loading" | "ready" | "error"
export type CourseLinksStoreErrorCode = CourseLinksErrorCode | "campus_required"

type CourseLinksApi = Pick<CourseLinksApiService, "getList">
type CourseLinksApiFactory = (campus: CampusProfile) => CourseLinksApi

let apiFactory: CourseLinksApiFactory = (campus) =>
  new CourseLinksApiService(createAuthenticatedHttpClient(campus))
let linkPresenter: ExternalLinkPresenter = new BrowserExternalLinkPresenter()

export function setCourseLinksApiFactoryForTests(factory: CourseLinksApiFactory): void {
  apiFactory = factory
}

export function setExternalLinkPresenterForTests(presenter: ExternalLinkPresenter): void {
  linkPresenter = presenter
}

export function resetCourseLinksDependencies(): void {
  apiFactory = (campus) => new CourseLinksApiService(createAuthenticatedHttpClient(campus))
  linkPresenter = new BrowserExternalLinkPresenter()
}

export const useCourseLinksStore = defineStore("courseLinks", () => {
  const status = ref<CourseLinksStatus>("idle")
  const snapshot = ref<CourseLinksSnapshot | null>(null)
  const errorCode = ref<CourseLinksStoreErrorCode | null>(null)
  const openErrorCode = ref<CourseLinksStoreErrorCode | null>(null)

  async function load(context: CourseNavigationContext): Promise<boolean> {
    const campus = useCampusStore().selectedCampus

    if (!campus) {
      errorCode.value = "campus_required"
      status.value = "error"
      return false
    }

    status.value = "loading"
    errorCode.value = null
    openErrorCode.value = null

    try {
      snapshot.value = await apiFactory(campus).getList(context)
      status.value = "ready"
      return true
    } catch (error) {
      errorCode.value = error instanceof CourseLinksServiceError ? error.code : "server"
      status.value = "error"
      return false
    }
  }

  function openLink(link: CourseLink): boolean {
    openErrorCode.value = null

    try {
      linkPresenter.open(link.url)
      openErrorCode.value = null
      return true
    } catch {
      openErrorCode.value = "open_failed"
      return false
    }
  }

  function clearOpenError(): void {
    openErrorCode.value = null
  }

  function reset(): void {
    status.value = "idle"
    snapshot.value = null
    errorCode.value = null
    openErrorCode.value = null
  }

  return {
    status,
    snapshot,
    errorCode,
    openErrorCode,
    load,
    openLink,
    clearOpenError,
    reset,
  }
})
