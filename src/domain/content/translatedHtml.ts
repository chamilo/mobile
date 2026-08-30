function normalizeLocale(locale: string | null | undefined): string {
  return String(locale ?? "")
    .trim()
    .replace("-", "_")
}

function buildLocaleCandidates(locale: string | null | undefined): string[] {
  const normalizedLocale = normalizeLocale(locale)
  if (!normalizedLocale) return []

  const isoCode = normalizedLocale.split("_")[0] ?? ""
  const candidates: string[] = []

  function addCandidate(value: string): void {
    if (value && !candidates.includes(value)) candidates.push(value)
  }

  addCandidate(normalizedLocale)
  addCandidate(normalizedLocale.replace("_", "-"))
  addCandidate(isoCode)

  return candidates
}

function buildFallbackCandidates(
  locale: string | null | undefined,
  fallbackLocales: Array<string | null | undefined>,
): string[] {
  const candidates = buildLocaleCandidates(locale)

  for (const fallbackLocale of fallbackLocales) {
    for (const candidate of buildLocaleCandidates(fallbackLocale)) {
      if (!candidates.includes(candidate)) candidates.push(candidate)
    }
  }

  return candidates
}

function findByLang(elements: HTMLElement[], candidates: string[]): HTMLElement[] {
  for (const candidate of candidates) {
    const matches = elements.filter((element) => element.getAttribute("lang") === candidate)
    if (matches.length > 0) return matches
  }

  return []
}

function groupByParent(elements: HTMLElement[]): HTMLElement[][] {
  const groups = new Map<ParentNode | null, HTMLElement[]>()

  for (const element of elements) {
    const group = groups.get(element.parentNode) ?? []
    group.push(element)
    groups.set(element.parentNode, group)
  }

  return [...groups.values()]
}

function reveal(element: HTMLElement): void {
  element.classList.remove("hidden")
  element.style.display = element.tagName.toLowerCase() === "span" ? "inline" : "block"
}

function applyLanguageGroup(root: HTMLElement, selector: string, candidates: string[]): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  if (elements.length === 0) return

  for (const group of groupByParent(elements)) {
    let matches = findByLang(group, candidates)

    if (matches.length === 0) {
      matches = findByLang(group, buildLocaleCandidates(group[0]?.getAttribute("lang")))
    }

    for (const element of group) {
      if (matches.includes(element)) reveal(element)
      else element.remove()
    }
  }
}

/**
 * Filters Chamilo translate_html blocks before content is rendered or converted to plain text.
 * This is not an HTML sanitizer. Sanitization remains the responsibility of the rendering layer.
 */
export function filterTranslatedHtml(
  html: string,
  locale: string | null | undefined,
  fallbackLocales: Array<string | null | undefined> = [],
): string {
  if (!html) return html

  const candidates = buildFallbackCandidates(locale, fallbackLocales)
  if (candidates.length === 0) return html

  const container = document.createElement("div")
  container.innerHTML = html

  applyLanguageGroup(container, ".mce-translatehtml", candidates)
  applyLanguageGroup(container, "span[lang]:not(.mce-translatehtml)", candidates)

  return container.innerHTML
}

const BLOCK_TEXT_SELECTOR = [
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "dt",
  "dd",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
].join(",")

function extractPlainText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement

  clone.querySelectorAll("br").forEach((element) => {
    element.replaceWith(document.createTextNode(" "))
  })

  clone.querySelectorAll(BLOCK_TEXT_SELECTOR).forEach((element) => {
    element.insertAdjacentText("afterend", " ")
  })

  return (clone.textContent ?? "").replace(/\s+/g, " ").trim()
}

export function translatedPlainText(
  html: string,
  locale: string | null | undefined,
  fallbackLocales: Array<string | null | undefined> = [],
): string {
  if (!html) return ""

  const container = document.createElement("div")
  container.innerHTML = filterTranslatedHtml(html, locale, fallbackLocales)

  return extractPlainText(container)
}
