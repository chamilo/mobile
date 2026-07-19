import { normalizeSafeExternalUrl } from "@/domain/links/safeExternalUrl"

export interface ExternalLinkPresenter {
  open(url: string): void
}

export class BrowserExternalLinkPresenter implements ExternalLinkPresenter {
  open(value: string): void {
    const url = normalizeSafeExternalUrl(value)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    anchor.style.display = "none"

    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }
}
