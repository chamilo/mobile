import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import { safeDocumentFilename } from "@/domain/documents/presentation"
import { buildBreadcrumbs, childrenForNode, inferRootNodeId } from "@/domain/documents/tree"
import type { CourseDocument, DocumentsSnapshot } from "@/domain/documents/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  BrowserDocumentBlobPresenter,
  type DocumentBlobPresenter,
} from "@/services/documents/DocumentBlobPresenter"
import {
  DocumentsApiService,
  DocumentsServiceError,
  type DocumentsErrorCode,
} from "@/services/documents/DocumentsApiService"
import { useCampusStore } from "@/stores/campus"

export type DocumentsStatus = "idle" | "loading" | "ready" | "error"
export type DocumentDeliveryStatus = "idle" | "loading" | "error"
export type DocumentsStoreErrorCode = DocumentsErrorCode | "campus_required"

type DocumentsApi = Pick<DocumentsApiService, "getList" | "getContent" | "getDownload">
type DocumentsApiFactory = (campus: CampusProfile) => DocumentsApi

let apiFactory: DocumentsApiFactory = (campus) =>
  new DocumentsApiService(createAuthenticatedHttpClient(campus))
let blobPresenter: DocumentBlobPresenter = new BrowserDocumentBlobPresenter()

export function setDocumentsApiFactoryForTests(factory: DocumentsApiFactory): void {
  apiFactory = factory
}

export function setDocumentBlobPresenterForTests(presenter: DocumentBlobPresenter): void {
  blobPresenter = presenter
}

export function resetDocumentsDependencies(): void {
  apiFactory = (campus) => new DocumentsApiService(createAuthenticatedHttpClient(campus))
  blobPresenter = new BrowserDocumentBlobPresenter()
}

export const useDocumentsStore = defineStore("documents", () => {
  const status = ref<DocumentsStatus>("idle")
  const deliveryStatus = ref<DocumentDeliveryStatus>("idle")
  const snapshot = ref<DocumentsSnapshot | null>(null)
  const currentNodeId = ref<number | null>(null)
  const errorCode = ref<DocumentsStoreErrorCode | null>(null)
  const deliveryErrorCode = ref<DocumentsStoreErrorCode | null>(null)

  const rootNodeId = computed(() => inferRootNodeId(snapshot.value?.items ?? []))
  const visibleItems = computed(() =>
    childrenForNode(snapshot.value?.items ?? [], currentNodeId.value, rootNodeId.value),
  )
  const breadcrumbs = computed(() =>
    buildBreadcrumbs(snapshot.value?.items ?? [], currentNodeId.value, "Documents"),
  )

  function api(): DocumentsApi | null {
    const campus = useCampusStore().selectedCampus

    if (!campus) {
      errorCode.value = "campus_required"
      return null
    }

    return apiFactory(campus)
  }

  function mapError(error: unknown): DocumentsStoreErrorCode {
    return error instanceof DocumentsServiceError ? error.code : "server"
  }

  async function load(context: CourseNavigationContext): Promise<boolean> {
    const service = api()

    if (!service) {
      status.value = "error"
      return false
    }

    status.value = "loading"
    errorCode.value = null

    try {
      snapshot.value = await service.getList(context)
      currentNodeId.value = null
      status.value = "ready"

      return true
    } catch (error) {
      errorCode.value = mapError(error)
      status.value = "error"

      return false
    }
  }

  function clearDeliveryError(): void {
    deliveryErrorCode.value = null

    if (deliveryStatus.value === "error") {
      deliveryStatus.value = "idle"
    }
  }

  function openFolder(item: CourseDocument): void {
    if (item.filetype === "folder") {
      clearDeliveryError()
      currentNodeId.value = item.resourceNodeId
    }
  }

  function navigateTo(nodeId: number | null): void {
    clearDeliveryError()
    currentNodeId.value = nodeId
  }

  async function openDocument(
    context: CourseNavigationContext,
    item: CourseDocument,
  ): Promise<boolean> {
    const service = api()
    if (!service) return false

    deliveryStatus.value = "loading"
    deliveryErrorCode.value = null

    try {
      const blob = await service.getContent(context, item)
      blobPresenter.open(blob)
      deliveryErrorCode.value = null
      deliveryStatus.value = "idle"

      return true
    } catch (error) {
      deliveryErrorCode.value = mapError(error)
      deliveryStatus.value = "error"

      return false
    }
  }

  async function downloadDocument(
    context: CourseNavigationContext,
    item: CourseDocument,
  ): Promise<boolean> {
    const service = api()
    if (!service) return false

    deliveryStatus.value = "loading"
    deliveryErrorCode.value = null

    try {
      const blob = await service.getDownload(context, item)
      blobPresenter.download(blob, safeDocumentFilename(item))
      deliveryErrorCode.value = null
      deliveryStatus.value = "idle"

      return true
    } catch (error) {
      deliveryErrorCode.value = mapError(error)
      deliveryStatus.value = "error"

      return false
    }
  }

  function reset(): void {
    status.value = "idle"
    deliveryStatus.value = "idle"
    snapshot.value = null
    currentNodeId.value = null
    errorCode.value = null
    deliveryErrorCode.value = null
  }

  return {
    status,
    deliveryStatus,
    snapshot,
    currentNodeId,
    errorCode,
    deliveryErrorCode,
    rootNodeId,
    visibleItems,
    breadcrumbs,
    load,
    openFolder,
    navigateTo,
    openDocument,
    downloadDocument,
    clearDeliveryError,
    reset,
  }
})
