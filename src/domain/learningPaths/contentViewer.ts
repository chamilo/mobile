import { filterTranslatedHtmlDocument } from "@/domain/content/translatedHtml"

export type LearningPathViewerKind =
  | "image"
  | "video"
  | "audio"
  | "text"
  | "html"
  | "frame"
  | "unsupported"

export interface LearningPathContentInspection {
  kind: LearningPathViewerKind
  mimeType: string
  textContent: string
}

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"])
const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"])

const MIME_BY_EXTENSION: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  xhtml: "application/xhtml+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
}

function normalizedMimeType(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? ""
}

function extensionFromReference(reference: string): string {
  const value = reference.trim()
  if (!value) return ""

  try {
    const url = new URL(value, "https://chamilo.invalid")
    const match = decodeURIComponent(url.pathname)
      .toLowerCase()
      .match(/\.([a-z0-9]+)$/)

    return match?.[1] ?? ""
  } catch {
    const match = value
      .split(/[?#]/, 1)[0]
      ?.toLowerCase()
      .match(/\.([a-z0-9]+)$/)

    return match?.[1] ?? ""
  }
}

function mimeFromReferences(itemTitle: string, contentUrl: string): string {
  const titleMime = MIME_BY_EXTENSION[extensionFromReference(itemTitle)]
  if (titleMime) return titleMime

  return MIME_BY_EXTENSION[extensionFromReference(contentUrl)] ?? ""
}

function kindFromMime(mimeType: string): LearningPathViewerKind | null {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (HTML_MIME_TYPES.has(mimeType)) return "html"
  if (mimeType === "application/pdf") return "frame"
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return "text"
  }

  return null
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value)
}

function sniffBinaryMime(bytes: Uint8Array): string {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp"
  }

  return ""
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true
  if (bytes.some((value) => value === 0)) return false

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return false
  }

  let printable = 0
  for (const value of bytes) {
    if (value === 9 || value === 10 || value === 13 || value >= 32) {
      printable += 1
    }
  }

  return printable / bytes.length >= 0.92
}

function looksLikeHtml(value: string): boolean {
  const sample = value
    .replace(/^\uFEFF/, "")
    .trimStart()
    .slice(0, 8_192)
    .toLowerCase()

  return (
    /^<!doctype\s+html\b/.test(sample) ||
    /^<(?:html|head|body|meta|title|style)\b/.test(sample) ||
    /^<(?:p|div|section|article|main|header|footer|h[1-6]|table|ul|ol|span|br)\b/.test(sample) ||
    /<(?:html|body)\b/.test(sample)
  )
}

async function readPrefix(blob: Blob): Promise<{ bytes: Uint8Array; text: string }> {
  const bytes = new Uint8Array(await blob.slice(0, 8_192).arrayBuffer())
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes)

  return { bytes, text }
}

export async function inspectLearningPathContent(
  blob: Blob,
  itemTitle: string,
  contentUrl = "",
): Promise<LearningPathContentInspection> {
  const declaredMime = normalizedMimeType(blob.type)
  const referenceMime = mimeFromReferences(itemTitle, contentUrl)

  if (!GENERIC_MIME_TYPES.has(declaredMime)) {
    const declaredKind = kindFromMime(declaredMime)
    if (declaredKind) {
      return {
        kind: declaredKind,
        mimeType: declaredMime,
        textContent: declaredKind === "html" || declaredKind === "text" ? await blob.text() : "",
      }
    }
  }

  if (referenceMime) {
    const referenceKind = kindFromMime(referenceMime)
    if (referenceKind) {
      return {
        kind: referenceKind,
        mimeType: referenceMime,
        textContent: referenceKind === "html" || referenceKind === "text" ? await blob.text() : "",
      }
    }
  }

  const { bytes, text } = await readPrefix(blob)
  const sniffedMime = sniffBinaryMime(bytes)
  if (sniffedMime) {
    return {
      kind: kindFromMime(sniffedMime) ?? "unsupported",
      mimeType: sniffedMime,
      textContent: "",
    }
  }

  if (looksLikeText(bytes)) {
    const fullText = bytes.length === blob.size ? text : await blob.text()
    const html = looksLikeHtml(fullText)

    return {
      kind: html ? "html" : "text",
      mimeType: html ? "text/html" : "text/plain",
      textContent: fullText,
    }
  }

  return {
    kind: "unsupported",
    mimeType: declaredMime || referenceMime || "application/octet-stream",
    textContent: "",
  }
}

export function prepareResponsiveHtmlDocument(
  html: string,
  locale: string | null | undefined = null,
  fallbackLocales: Array<string | null | undefined> = [],
): string {
  const localizedHtml =
    locale || fallbackLocales.length > 0
      ? filterTranslatedHtmlDocument(html, locale, fallbackLocales)
      : html
  const additions = `
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style data-chamilo-mobile-document>
  :root { color-scheme: light; }
  html { background: #fff; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body {
    box-sizing: border-box;
    max-width: 100%;
    margin: 0;
    padding: 12px;
    overflow-wrap: anywhere;
    color: #1e293b;
    background: #fff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.5;
  }
  *, *::before, *::after { box-sizing: border-box; }
  img, video, svg, canvas { max-width: 100% !important; height: auto !important; }
  iframe { max-width: 100% !important; }
  table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
  pre, code { max-width: 100%; white-space: pre-wrap; overflow-wrap: anywhere; }
  a { overflow-wrap: anywhere; }
  @media (max-width: 390px) {
    body { padding: 10px; font-size: 15px; }
  }
</style>`

  if (/<head(?:\s[^>]*)?>/i.test(localizedHtml)) {
    return localizedHtml.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${additions}`)
  }

  if (/<html(?:\s[^>]*)?>/i.test(localizedHtml)) {
    return localizedHtml.replace(/<html(\s[^>]*)?>/i, (match) => `${match}<head>${additions}</head>`)
  }

  return `<!doctype html><html><head>${additions}</head><body>${localizedHtml}</body></html>`
}
