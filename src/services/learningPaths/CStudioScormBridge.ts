import {
  readCStudioChamiloResource,
  type CStudioChamiloResource,
} from "@/domain/learningPaths/cstudioResource"

interface CStudioScormBridgeOptions {
  openLabel: string
  unavailableLabel: string
  onOpen: (resource: CStudioChamiloResource) => void
}

function resourceRoot(frame: HTMLIFrameElement): Element {
  return (
    frame.closest(".cstudio-chamilo-resource") ??
    frame.parentElement ??
    frame
  )
}

function replaceFrame(
  frame: HTMLIFrameElement,
  options: CStudioScormBridgeOptions,
): void {
  if (frame.dataset.chamiloMobileBridge === "1") return

  frame.dataset.chamiloMobileBridge = "1"
  const root = resourceRoot(frame)
  const resource = readCStudioChamiloResource(root)
  frame.removeAttribute("src")

  const container = frame.ownerDocument.createElement("div")
  container.dataset.chamiloMobileCstudioBridge = "1"
  container.style.padding = "16px"
  container.style.background = "#f8fafc"
  container.style.border = "1px solid #cbd5e1"
  container.style.borderRadius = "12px"
  container.style.textAlign = "center"

  if (!resource) {
    const message = frame.ownerDocument.createElement("p")
    message.textContent = options.unavailableLabel
    message.style.margin = "0"
    message.style.color = "#475569"
    message.style.fontFamily = "system-ui, sans-serif"
    container.append(message)
    frame.replaceWith(container)
    return
  }

  const title = frame.ownerDocument.createElement("p")
  title.textContent = resource.title
  title.style.margin = "0 0 12px"
  title.style.fontWeight = "600"
  title.style.color = "#0f172a"
  title.style.fontFamily = "system-ui, sans-serif"

  const button = frame.ownerDocument.createElement("button")
  button.type = "button"
  button.textContent = options.openLabel
  button.setAttribute("aria-label", `${options.openLabel}: ${resource.title}`)
  button.style.minHeight = "44px"
  button.style.padding = "10px 16px"
  button.style.border = "0"
  button.style.borderRadius = "10px"
  button.style.background = "#2563eb"
  button.style.color = "#ffffff"
  button.style.fontWeight = "600"
  button.style.cursor = "pointer"
  button.style.fontFamily = "system-ui, sans-serif"
  button.addEventListener("click", () => options.onOpen(resource))

  container.append(title, button)
  frame.replaceWith(container)
}

export function installCStudioScormBridge(
  document: Document,
  options: CStudioScormBridgeOptions,
): () => void {
  const enhance = (): void => {
    document
      .querySelectorAll<HTMLIFrameElement>("iframe.cstudio-chamilo-resource-frame")
      .forEach((frame) => replaceFrame(frame, options))
  }

  enhance()

  const observer = new MutationObserver(enhance)
  observer.observe(document.documentElement, { childList: true, subtree: true })

  return () => observer.disconnect()
}
