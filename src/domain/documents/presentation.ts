import type { CourseDocument } from "@/domain/documents/types"

export function documentIcon(item: CourseDocument): string {
  if (item.filetype === "folder") return "pi pi-folder"
  if (item.file.image) return "pi pi-image"
  if (item.file.video) return "pi pi-video"
  if (item.filetype === "html" || item.file.text) return "pi pi-file-edit"

  const mimeType = item.file.mimeType ?? ""

  if (mimeType === "application/pdf") return "pi pi-file-pdf"
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "pi pi-file-export"

  return "pi pi-file"
}

export function formatDocumentSize(size: number | null): string | null {
  if (size === null || size < 0) return null
  if (size < 1024) return `${size} B`

  const kilobytes = size / 1024
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`

  const megabytes = kilobytes / 1024
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`
}

export function safeDocumentFilename(item: CourseDocument): string {
  const filename = item.file.originalName || item.title || `document-${item.iid}`

  return filename.replace(/[\\/:*?"<>|]+/g, "-").trim() || `document-${item.iid}`
}
