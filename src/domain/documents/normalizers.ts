import type {
  CourseDocument,
  DocumentResourceFile,
  DocumentsSnapshot,
} from "@/domain/documents/types"

export class DocumentsContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DocumentsContractError"
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DocumentsContractError(`${field} must be an object.`)
  }

  return value as Record<string, unknown>
}

function asInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DocumentsContractError(`${field} must be an integer.`)
  }

  return value
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function booleanOrFalse(value: unknown): boolean {
  return value === true
}

function members(response: Record<string, unknown>): unknown[] {
  if (Array.isArray(response["hydra:member"])) {
    return response["hydra:member"]
  }

  if (Array.isArray(response.member)) {
    return response.member
  }

  throw new DocumentsContractError("The document collection is missing its members.")
}

function normalizeResourceFile(resourceNode: Record<string, unknown>): DocumentResourceFile {
  const rawFile = resourceNode.firstResourceFile

  if (!rawFile || typeof rawFile !== "object" || Array.isArray(rawFile)) {
    return {
      mimeType: null,
      originalName: null,
      size: null,
      image: false,
      video: false,
      text: false,
    }
  }

  const file = rawFile as Record<string, unknown>

  return {
    mimeType: nullableString(file.mimeType),
    originalName: nullableString(file.originalName),
    size: nullableInteger(file.size),
    image: booleanOrFalse(file.image),
    video: booleanOrFalse(file.video),
    text: booleanOrFalse(file.text),
  }
}

function normalizeDocument(value: unknown, index: number): CourseDocument {
  const item = asRecord(value, `items[${index}]`)
  const resourceNode = asRecord(item.resourceNode, `items[${index}].resourceNode`)
  const parent =
    resourceNode.parent &&
    typeof resourceNode.parent === "object" &&
    !Array.isArray(resourceNode.parent)
      ? (resourceNode.parent as Record<string, unknown>)
      : null

  return {
    iid: asInteger(item.iid, `items[${index}].iid`),
    title:
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : `Document ${String(item.iid)}`,
    filetype: typeof item.filetype === "string" ? item.filetype : "file",
    contentUrl: nullableString(item.contentUrl),
    downloadUrl: nullableString(item.downloadUrl),
    resourceNodeId: asInteger(resourceNode.id, `items[${index}].resourceNode.id`),
    parentResourceNodeId: parent ? nullableInteger(parent.id) : null,
    file: normalizeResourceFile(resourceNode),
  }
}

export function normalizeDocumentsResponse(value: unknown): DocumentsSnapshot {
  const response = asRecord(value, "response")
  const items = members(response).map(normalizeDocument)
  const rawTotal = response["hydra:totalItems"] ?? response.totalItems
  const totalItems = typeof rawTotal === "number" ? asInteger(rawTotal, "totalItems") : items.length

  if (totalItems !== items.length) {
    throw new DocumentsContractError("The document total does not match the returned collection.")
  }

  return { items, totalItems }
}
