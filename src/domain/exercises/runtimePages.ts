import { filterTranslatedHtml } from "@/domain/content/translatedHtml"
import { isStructuralExerciseQuestion } from "@/domain/exercises/answers"
import type { ExerciseQuestion } from "@/domain/exercises/types"

export interface ExerciseRuntimePageContent {
  id: number
  title: string
  description: string
}

export interface ExerciseRuntimePage {
  index: number
  number: number
  type: string
  questionIds: number[]
  media: ExerciseRuntimePageContent | null
  pageBreak: ExerciseRuntimePageContent | null
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0) || 0
}

function contentValue(value: unknown): ExerciseRuntimePageContent | null {
  const item = record(value)
  if (!item) return null
  const content = record(item.content)
  const title = stringValue(item.title || content?.title)
  const description = stringValue(item.description || content?.description)
  const id = Math.max(0, numberValue(item.id))

  return title.trim() || description.trim() || id > 0 ? { id, title, description } : null
}

export function normalizeExerciseRuntimePages(
  settings: Record<string, unknown>,
  questions: ExerciseQuestion[],
): ExerciseRuntimePage[] {
  const rawPages = Array.isArray(settings.runtimePages) ? settings.runtimePages : []
  const questionMap = new Map(
    questions
      .filter((question) => !isStructuralExerciseQuestion(question))
      .map((question) => [question.id, question]),
  )

  const pages: ExerciseRuntimePage[] = []

  for (const value of rawPages) {
    const page = record(value)
    if (!page) continue

    const questionIds = Array.isArray(page.questionIds)
      ? page.questionIds
          .map(numberValue)
          .filter(
            (questionId) =>
              Number.isInteger(questionId) && questionId > 0 && questionMap.has(questionId),
          )
      : []
    const media = contentValue(page.media)
    const pageBreak = contentValue(page.pageBreak)

    if (questionIds.length === 0 && !media && !pageBreak) continue

    pages.push({
      index: pages.length,
      number: pages.length + 1,
      type: stringValue(page.type) || "questions",
      questionIds,
      media,
      pageBreak,
    })
  }

  return pages
}

export function usesExerciseRuntimePages(
  settings: Record<string, unknown>,
  pages: ExerciseRuntimePage[],
): boolean {
  return (
    pages.length > 0 &&
    (settings.effectiveOneQuestionPerPage === true || settings.usesStructuralPages === true)
  )
}

const UNSUPPORTED_STRUCTURAL_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
])

function isSupportedPublicUrl(value: string, attribute: "href" | "src"): boolean {
  const url = value.trim()
  if (!url || url.startsWith("#")) return attribute === "href"
  if (attribute === "href" && (url.startsWith("mailto:") || url.startsWith("tel:"))) return true

  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export function exerciseStructuralHtmlRequiresCampus(
  html: string,
  campusBaseUrl: string | null = null,
): boolean {
  if (!html.trim()) return false

  const container = document.createElement("div")
  container.innerHTML = html

  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    if (UNSUPPORTED_STRUCTURAL_TAGS.has(element.tagName.toLowerCase())) return true

    for (const attribute of ["src", "poster"] as const) {
      if (!element.hasAttribute(attribute)) continue

      const value = element.getAttribute(attribute) ?? ""
      if (!isSupportedPublicUrl(value, "src")) return true

      if (campusBaseUrl) {
        try {
          const campus = new URL(campusBaseUrl)
          const resource = new URL(value)
          if (resource.origin === campus.origin) return true
        } catch {
          return true
        }
      }
    }
  }

  return false
}

export function exerciseRuntimePagesRequireCampus(
  pages: ExerciseRuntimePage[],
  campusBaseUrl: string | null = null,
): boolean {
  return pages.some((page) => {
    const values = [
      page.media?.title,
      page.media?.description,
      page.pageBreak?.title,
      page.pageBreak?.description,
    ]

    return values.some(
      (value) => value && exerciseStructuralHtmlRequiresCampus(value, campusBaseUrl),
    )
  })
}

const ALLOWED_TAGS = new Set([
  "a",
  "audio",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "video",
])

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["lang", "title"])
const MEDIA_ALLOWED_ATTRIBUTES = new Set([
  "src",
  "alt",
  "controls",
  "poster",
  "preload",
  "width",
  "height",
])

export function sanitizeExerciseStructuralHtml(
  html: string,
  locale: string,
  fallbackLocales: string[] = [],
): string {
  if (!html.trim()) return ""

  const translated = filterTranslatedHtml(html, locale, fallbackLocales)
  const container = document.createElement("div")
  container.innerHTML = translated

  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const tag = element.tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes))
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const keepGlobal = GLOBAL_ALLOWED_ATTRIBUTES.has(name)
      const keepLink = tag === "a" && name === "href"
      const keepMedia =
        ["img", "audio", "video", "source"].includes(tag) &&
        MEDIA_ALLOWED_ATTRIBUTES.has(name)

      if (!keepGlobal && !keepLink && !keepMedia) element.removeAttribute(attribute.name)
    }

    if (tag === "a") {
      const href = element.getAttribute("href") ?? ""
      if (!isSupportedPublicUrl(href, "href")) element.removeAttribute("href")
      else {
        element.setAttribute("target", "_blank")
        element.setAttribute("rel", "noopener noreferrer")
      }
    }

    if (["img", "audio", "video", "source"].includes(tag)) {
      const src = element.getAttribute("src") ?? ""
      if (src && !isSupportedPublicUrl(src, "src")) element.removeAttribute("src")
    }

    if (tag === "video") {
      const poster = element.getAttribute("poster") ?? ""
      if (poster && !isSupportedPublicUrl(poster, "src")) element.removeAttribute("poster")
    }
  }

  return container.innerHTML
}
