import { describe, expect, it } from "vitest"

import { DocumentsContractError, normalizeDocumentsResponse } from "@/domain/documents/normalizers"

describe("normalizeDocumentsResponse", () => {
  it("normalizes the verified Hydra collection", () => {
    const snapshot = normalizeDocumentsResponse({
      "hydra:member": [
        {
          iid: 80,
          title: "Runtime SCORM",
          filetype: "file",
          contentUrl: "/r/document/files/uuid/view",
          downloadUrl: "/r/document/files/uuid/download",
          resourceNode: {
            id: 717,
            parent: { id: 467 },
            firstResourceFile: {
              mimeType: "application/zip",
              originalName: "runtime.zip",
              size: 2048,
              image: false,
              video: false,
              text: false,
            },
          },
        },
      ],
      "hydra:totalItems": 1,
    })

    expect(snapshot.items[0]).toEqual({
      iid: 80,
      title: "Runtime SCORM",
      filetype: "file",
      contentUrl: "/r/document/files/uuid/view",
      downloadUrl: "/r/document/files/uuid/download",
      resourceNodeId: 717,
      parentResourceNodeId: 467,
      file: {
        mimeType: "application/zip",
        originalName: "runtime.zip",
        size: 2048,
        image: false,
        video: false,
        text: false,
      },
    })
  })

  it("rejects an invalid collection", () => {
    expect(() => normalizeDocumentsResponse({})).toThrow(DocumentsContractError)
  })
})
