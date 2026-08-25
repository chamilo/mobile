const SELECTED_CAMPUS_PLACEHOLDER = "https://selected-campus.invalid/"
const MAX_FILENAME_LENGTH = 180
const INVALID_FILENAME_CHARACTERS = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"])

function replaceUnsafeFilenameCharacters(value: string): string {
  let result = ""
  let replacing = false

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    const invalid =
      codePoint <= 0x1f || codePoint === 0x7f || INVALID_FILENAME_CHARACTERS.has(character)

    if (invalid) {
      if (!replacing) result += "-"
      replacing = true
      continue
    }

    result += character
    replacing = false
  }

  return result
}

function sanitizeFilename(value: string, fallback: string): string {
  const normalized = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? ""

  const cleaned = replaceUnsafeFilenameCharacters(normalized)
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH)
    .trim()

  if (cleaned) return cleaned

  const safeFallback = fallback.replace(/\\/g, "/").split("/").pop()?.trim() ?? ""

  const cleanedFallback = replaceUnsafeFilenameCharacters(safeFallback)
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH)
    .trim()

  return cleanedFallback || "assignment-file"
}

function unquote(value: string): string {
  const trimmed = value.trim()

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\(["\\])/g, "$1")
  }

  return trimmed
}

export function assignmentDownloadPath(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? ""
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("//")) return null

  try {
    const base = new URL(SELECTED_CAMPUS_PLACEHOLDER)
    const resolved = new URL(raw, base)

    if (resolved.origin !== base.origin) return null

    return `${resolved.pathname}${resolved.search}`
  } catch {
    return null
  }
}

export function assignmentDownloadFilename(
  contentDisposition: string | null | undefined,
  fallback: string,
): string {
  const header = contentDisposition?.trim() ?? ""

  if (header) {
    const extendedMatch = header.match(/filename\*\s*=\s*([^;]+)/i)
    if (extendedMatch?.[1]) {
      let encoded = unquote(extendedMatch[1])
      encoded = encoded.replace(/^[^']*'[^']*'/, "")

      try {
        return sanitizeFilename(decodeURIComponent(encoded), fallback)
      } catch {
        return sanitizeFilename(encoded, fallback)
      }
    }

    const filenameMatch = header.match(/filename\s*=\s*("(?:\\.|[^"])*"|[^;]+)/i)
    if (filenameMatch?.[1]) {
      return sanitizeFilename(unquote(filenameMatch[1]), fallback)
    }
  }

  return sanitizeFilename(fallback, "assignment-file")
}
