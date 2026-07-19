const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
])

const BLOCKED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "LINK",
  "META",
  "SVG",
  "MATH",
])

const GLOBAL_ATTRIBUTES = new Set(["dir", "lang", "title"])
const LINK_ATTRIBUTES = new Set(["href"])
const IMAGE_ATTRIBUTES = new Set(["alt", "height", "src", "width"])

function resolveSafeHttpUrl(value: string, campusBaseUrl: string): URL | null {
  try {
    const url = new URL(value, campusBaseUrl.endsWith("/") ? campusBaseUrl : `${campusBaseUrl}/`)

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null
    }

    return url
  } catch {
    return null
  }
}

function sanitizeAnchor(element: Element, campusBaseUrl: string): void {
  const href = element.getAttribute("href")?.trim()

  if (!href) {
    element.removeAttribute("href")
    return
  }

  if (/^(mailto:|tel:)/i.test(href)) {
    element.setAttribute("href", href)
  } else {
    const url = resolveSafeHttpUrl(href, campusBaseUrl)

    if (!url) {
      element.removeAttribute("href")
      return
    }

    element.setAttribute("href", url.toString())
  }

  element.setAttribute("target", "_blank")
  element.setAttribute("rel", "noopener noreferrer nofollow")
}

function sanitizeImage(element: Element, campusBaseUrl: string): void {
  const src = element.getAttribute("src")?.trim()

  if (!src) {
    element.removeAttribute("src")
    return
  }

  const url = resolveSafeHttpUrl(src, campusBaseUrl)
  const campusOrigin = new URL(campusBaseUrl).origin

  if (!url || url.origin !== campusOrigin) {
    element.removeAttribute("src")
    return
  }

  element.setAttribute("src", url.toString())
  element.setAttribute("loading", "lazy")
  element.setAttribute("referrerpolicy", "no-referrer")
}

function unwrapElement(element: Element): void {
  const parent = element.parentNode

  if (!parent) {
    element.remove()
    return
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }

  parent.removeChild(element)
}

export function sanitizeAnnouncementHtml(html: string, campusBaseUrl: string): string {
  if (!html.trim()) {
    return ""
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(html, "text/html")
  const elements = Array.from(document.body.querySelectorAll("*"))

  elements.forEach((element) => {
    if (BLOCKED_TAGS.has(element.tagName)) {
      element.remove()
      return
    }

    if (!ALLOWED_TAGS.has(element.tagName)) {
      unwrapElement(element)
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const allowed =
        GLOBAL_ATTRIBUTES.has(name) ||
        (element.tagName === "A" && LINK_ATTRIBUTES.has(name)) ||
        (element.tagName === "IMG" && IMAGE_ATTRIBUTES.has(name))

      if (!allowed) {
        element.removeAttribute(attribute.name)
      }
    })

    if (element.tagName === "A") {
      sanitizeAnchor(element, campusBaseUrl)
    }

    if (element.tagName === "IMG") {
      sanitizeImage(element, campusBaseUrl)
    }
  })

  return document.body.innerHTML
}
