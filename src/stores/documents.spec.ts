import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CourseDocument } from "@/domain/documents/types"
import { DocumentsServiceError } from "@/services/documents/DocumentsApiService"
import type { CampusProfileRepository } from "@/services/campus/CampusProfileRepository"
import {
  resetCampusProfileRepository,
  setCampusProfileRepositoryForTests,
  useCampusStore,
} from "@/stores/campus"
import {
  resetDocumentsDependencies,
  setDocumentBlobPresenterForTests,
  setDocumentsApiFactoryForTests,
  useDocumentsStore,
} from "@/stores/documents"

const item: CourseDocument = {
  iid: 1,
  title: "Document",
  filetype: "file",
  contentUrl: "/view",
  downloadUrl: "/download",
  resourceNodeId: 2,
  parentResourceNodeId: 1,
  file: {
    mimeType: "text/plain",
    originalName: "document.txt",
    size: 10,
    image: false,
    video: false,
    text: true,
  },
}

const folder: CourseDocument = {
  ...item,
  iid: 2,
  title: "Folder",
  filetype: "folder",
  contentUrl: null,
  downloadUrl: null,
  resourceNodeId: 3,
}

const repository: CampusProfileRepository = {
  load: () => ({
    version: 1,
    profiles: [
      {
        id: "campus-a",
        displayName: "Campus",
        baseUrl: "https://campus.local",
        compatibilityStatus: "unknown",
        compatibilityCheckedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    selectedCampusId: "campus-a",
  }),
  save: vi.fn(),
}

describe("documents store delivery state", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setCampusProfileRepositoryForTests(repository)
    useCampusStore().initialize()
  })

  afterEach(() => {
    resetDocumentsDependencies()
    resetCampusProfileRepository()
  })

  it("clears a delivery error when navigating to a folder", async () => {
    setDocumentsApiFactoryForTests(() => ({
      getList: async () => ({ items: [folder, item], totalItems: 2 }),
      getContent: async () => {
        throw new DocumentsServiceError("not_found", "Missing")
      },
      getDownload: async () => new Blob(["content"]),
    }))
    setDocumentBlobPresenterForTests({
      open: vi.fn(),
      download: vi.fn(),
    })

    const store = useDocumentsStore()
    await store.openDocument(
      {
        courseId: 10,
        sessionId: null,
        membershipId: 1,
        sessionCourseId: null,
        source: "direct",
      },
      item,
    )

    expect(store.deliveryErrorCode).toBe("not_found")

    store.openFolder(folder)

    expect(store.deliveryErrorCode).toBeNull()
    expect(store.deliveryStatus).toBe("idle")
  })

  it("clears the previous error after a successful download", async () => {
    let shouldFail = true
    const download = vi.fn()

    setDocumentsApiFactoryForTests(() => ({
      getList: async () => ({ items: [item], totalItems: 1 }),
      getContent: async () => new Blob(["content"]),
      getDownload: async () => {
        if (shouldFail) {
          shouldFail = false
          throw new DocumentsServiceError("not_found", "Missing")
        }

        return new Blob(["content"])
      },
    }))
    setDocumentBlobPresenterForTests({ open: vi.fn(), download })

    const store = useDocumentsStore()
    const context = {
      courseId: 10,
      sessionId: null,
      membershipId: 1,
      sessionCourseId: null,
      source: "direct" as const,
    }

    await store.downloadDocument(context, item)
    expect(store.deliveryErrorCode).toBe("not_found")

    await store.downloadDocument(context, item)

    expect(store.deliveryErrorCode).toBeNull()
    expect(store.deliveryStatus).toBe("idle")
    expect(download).toHaveBeenCalledOnce()
  })
})
