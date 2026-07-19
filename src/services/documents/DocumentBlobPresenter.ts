export interface DocumentBlobPresenter {
  open(blob: Blob): void
  download(blob: Blob, filename: string): void
}

export class BrowserDocumentBlobPresenter implements DocumentBlobPresenter {
  open(blob: Blob): void {
    const objectUrl = URL.createObjectURL(blob)
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")

    if (!opened) {
      URL.revokeObjectURL(objectUrl)
      throw new Error("The document viewer could not be opened.")
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  download(blob: Blob, filename: string): void {
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
