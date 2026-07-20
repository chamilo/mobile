import { Capacitor } from "@capacitor/core"

import {
  chamiloDocumentPlugin,
  type ChamiloDocumentPlugin,
} from "@/services/documents/ChamiloDocumentPlugin"

export interface DocumentBlobPresenter {
  open(blob: Blob, filename: string): Promise<void>
  download(blob: Blob, filename: string): Promise<void>
}

function normalizedMimeType(blob: Blob): string {
  return blob.type.trim() || "application/octet-stream"
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunkSize = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))

    for (const value of chunk) {
      binary += String.fromCharCode(value)
    }
  }

  return globalThis.btoa(binary)
}

export class BrowserDocumentBlobPresenter implements DocumentBlobPresenter {
  async open(blob: Blob): Promise<void> {
    const objectUrl = URL.createObjectURL(blob)
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")

    if (!opened) {
      URL.revokeObjectURL(objectUrl)
      throw new Error("The document viewer could not be opened.")
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  async download(blob: Blob, filename: string): Promise<void> {
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = "noopener noreferrer"
    anchor.style.display = "none"
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  }
}

export class NativeDocumentBlobPresenter implements DocumentBlobPresenter {
  constructor(private readonly plugin: ChamiloDocumentPlugin = chamiloDocumentPlugin) {}

  async open(blob: Blob, filename: string): Promise<void> {
    await this.plugin.open({
      base64: await blobToBase64(blob),
      filename,
      mimeType: normalizedMimeType(blob),
    })
  }

  async download(blob: Blob, filename: string): Promise<void> {
    await this.plugin.save({
      base64: await blobToBase64(blob),
      filename,
      mimeType: normalizedMimeType(blob),
    })
  }
}

export function createDocumentBlobPresenter(): DocumentBlobPresenter {
  return Capacitor.isNativePlatform()
    ? new NativeDocumentBlobPresenter()
    : new BrowserDocumentBlobPresenter()
}
