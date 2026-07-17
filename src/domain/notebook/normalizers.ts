import type {
  NotebookFormSnapshot,
  NotebookItem,
  NotebookLanguageOption,
  NotebookListSnapshot,
} from "@/domain/notebook/types"

export class NotebookContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotebookContractError"
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NotebookContractError("Notebook response is not an object.")
  }
  return value as Record<string, unknown>
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function positiveInteger(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new NotebookContractError("Notebook item identity is invalid.")
  }
  return Number(value)
}

function nullablePositiveInteger(value: unknown): number | null {
  return value === null || value === undefined ? null : positiveInteger(value)
}

function booleanValue(value: unknown): boolean {
  return value === true
}

function normalizeLanguageOption(value: unknown): NotebookLanguageOption {
  const record = asRecord(value)
  return { label: stringValue(record.label), value: stringValue(record.value) }
}

function normalizeItem(value: unknown): NotebookItem {
  const record = asRecord(value)
  return {
    iid: positiveInteger(record.iid),
    title: stringValue(record.title).trim(),
    content: stringValue(record.content),
    creationDate: stringValue(record.creationDate),
    updateDate: nullableString(record.updateDate),
    sessionId: nullablePositiveInteger(record.sessionId),
    language: nullableString(record.language),
    canEdit: booleanValue(record.canEdit),
    canDelete: booleanValue(record.canDelete),
  }
}

export function normalizeNotebookListResponse(value: unknown): NotebookListSnapshot {
  const record = asRecord(value)
  const items = Array.isArray(record.items) ? record.items.map(normalizeItem) : []
  const canWrite = booleanValue(record.canWrite)
  return {
    items,
    totalItems: typeof record.totalItems === "number" ? record.totalItems : items.length,
    courseId: positiveInteger(record.courseId),
    sessionId: nullablePositiveInteger(record.sessionId),
    canWrite,
    studentView: booleanValue(record.studentView),
    sort: stringValue(record.sort, "creation_date"),
    direction: stringValue(record.direction, "ASC"),
    csrfToken: canWrite ? nullableString(record.csrfToken) : null,
  }
}

export function normalizeNotebookFormResponse(value: unknown): NotebookFormSnapshot {
  const record = asRecord(value)
  const canWrite = booleanValue(record.canWrite)
  return {
    iid: nullablePositiveInteger(record.iid),
    title: stringValue(record.title),
    content: stringValue(record.content),
    language: stringValue(record.language),
    languages: Array.isArray(record.languages)
      ? record.languages.map(normalizeLanguageOption).filter((item) => item.value.length > 0)
      : [],
    canWrite,
    isNew: booleanValue(record.isNew),
    fullEditor: booleanValue(record.fullEditor),
    csrfToken: canWrite ? nullableString(record.csrfToken) : null,
  }
}
