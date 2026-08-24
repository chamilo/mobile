export type ExerciseRichAnswerSegment =
  | { type: "text"; text: string }
  | { type: "break" }
  | { type: "image"; src: string; alt: string }

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
])

const DROPPED_TAGS = new Set([
  "BASE",
  "BUTTON",
  "EMBED",
  "FORM",
  "IFRAME",
  "INPUT",
  "LINK",
  "MATH",
  "META",
  "NOSCRIPT",
  "OBJECT",
  "SCRIPT",
  "SELECT",
  "STYLE",
  "SVG",
  "TEMPLATE",
  "TEXTAREA",
])

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ")
}

function isSafeImageSource(value: string): boolean {
  const source = value.trim()
  if (!source) return false

  if (/^data:/i.test(source)) {
    return /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(source)
  }

  return !/^(?:javascript|vbscript|file|content|blob):/i.test(source)
}

function appendBreak(segments: ExerciseRichAnswerSegment[]): void {
  if (segments.length === 0 || segments[segments.length - 1]?.type === "break") return
  segments.push({ type: "break" })
}

function normalizeSegments(segments: ExerciseRichAnswerSegment[]): ExerciseRichAnswerSegment[] {
  const result: ExerciseRichAnswerSegment[] = []

  for (const segment of segments) {
    if (segment.type === "break") {
      appendBreak(result)
      continue
    }

    if (segment.type === "image") {
      result.push(segment)
      continue
    }

    const text = normalizedText(segment.text)
    if (!text.trim()) continue

    const previous = result[result.length - 1]
    if (previous?.type === "text") {
      const needsSpace = !previous.text.endsWith(" ") && !text.startsWith(" ")
      previous.text = `${previous.text}${needsSpace ? " " : ""}${text}`
    } else {
      result.push({ type: "text", text })
    }
  }

  while (result[0]?.type === "break") result.shift()
  while (result[result.length - 1]?.type === "break") result.pop()

  return result.map((segment) =>
    segment.type === "text" ? { ...segment, text: segment.text.trim() } : segment,
  )
}

export function parseExerciseRichAnswerContent(
  value: string,
  fallbackImageAlt: string,
): ExerciseRichAnswerSegment[] {
  if (!value.trim()) return []

  if (typeof DOMParser === "undefined") {
    return [{ type: "text", text: value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() }]
  }

  const document = new DOMParser().parseFromString(value, "text/html")
  const segments: ExerciseRichAnswerSegment[] = []

  function visit(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push({ type: "text", text: node.textContent ?? "" })
      return
    }

    if (!(node instanceof HTMLElement)) return

    if (DROPPED_TAGS.has(node.tagName)) return

    if (node.tagName === "BR") {
      appendBreak(segments)
      return
    }

    if (node.tagName === "IMG") {
      const src = node.getAttribute("src")?.trim() ?? ""
      if (!isSafeImageSource(src)) return

      const alt = node.getAttribute("alt")?.trim() || fallbackImageAlt
      segments.push({ type: "image", src, alt })
      return
    }

    const block = BLOCK_TAGS.has(node.tagName)
    if (block) appendBreak(segments)
    node.childNodes.forEach(visit)
    if (block) appendBreak(segments)
  }

  document.body.childNodes.forEach(visit)

  return normalizeSegments(segments)
}
