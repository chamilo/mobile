import { describe, expect, it, vi } from "vitest"

import type { ChamiloDocumentPlugin } from "@/services/documents/ChamiloDocumentPlugin"
import {
  blobToBase64,
  NativeDocumentBlobPresenter,
} from "@/services/documents/DocumentBlobPresenter"

describe("NativeDocumentBlobPresenter", () => {
  it("converts a blob without changing its bytes", async () => {
    expect(await blobToBase64(new Blob(["Hello"]))).toBe("SGVsbG8=")
  })

  it("passes file content and metadata to the native plugin", async () => {
    const plugin: ChamiloDocumentPlugin = {
      open: vi.fn(async () => undefined),
      save: vi.fn(async () => ({ saved: true })),
    }
    const presenter = new NativeDocumentBlobPresenter(plugin)
    const blob = new Blob(["PDF"], { type: "application/pdf" })

    await presenter.open(blob, "lesson.pdf")
    await presenter.download(blob, "lesson.pdf")

    expect(plugin.open).toHaveBeenCalledWith({
      base64: "UERG",
      filename: "lesson.pdf",
      mimeType: "application/pdf",
    })
    expect(plugin.save).toHaveBeenCalledWith({
      base64: "UERG",
      filename: "lesson.pdf",
      mimeType: "application/pdf",
    })
  })
})
