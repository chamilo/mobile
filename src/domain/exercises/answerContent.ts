const BLOCKED_TAGS = new Set([
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
  "link",
  "meta",
  "svg",
  "math",
])

export interface ExerciseChoiceImageContent {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface ExerciseChoiceContent {
  text: string
  images: ExerciseChoiceImageContent[]
}

function isSafeImageSource(value: string): boolean {
  const source = value.trim()
  if (!source) return false

  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(source)) {
    return true
  }

  try {
    const url = new URL(source)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function optionalImageDimension(value: string | null): number | undefined {
  if (!value || !/^\d{1,4}$/.test(value)) return undefined

  const size = Number(value)
  return size > 0 ? size : undefined
}

/**
 * Extract the limited rich content used by image-answer choices.
 *
 * Exercise type 17 stores its answer body as HTML because the image is the
 * option itself. Returning structured data instead of raw HTML keeps rendering
 * under Vue's normal escaping rules and avoids v-html entirely.
 */
export function exerciseChoiceContent(html: string): ExerciseChoiceContent {
  if (!html.trim()) return { text: "", images: [] }

  const container = document.createElement("div")
  container.innerHTML = html

  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    if (BLOCKED_TAGS.has(element.tagName.toLowerCase())) element.remove()
  }

  const images: ExerciseChoiceImageContent[] = []
  for (const image of Array.from(container.querySelectorAll<HTMLImageElement>("img"))) {
    const src = image.getAttribute("src")?.trim() ?? ""
    if (isSafeImageSource(src)) {
      images.push({
        src,
        alt: image.getAttribute("alt") ?? "",
        ...(optionalImageDimension(image.getAttribute("width")) !== undefined
          ? { width: optionalImageDimension(image.getAttribute("width")) }
          : {}),
        ...(optionalImageDimension(image.getAttribute("height")) !== undefined
          ? { height: optionalImageDimension(image.getAttribute("height")) }
          : {}),
      })
    }

    image.remove()
  }

  const text = (container.textContent ?? "").replace(/\s+/g, " ").trim()

  return { text, images }
}
