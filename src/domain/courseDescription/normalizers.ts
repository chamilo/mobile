import type {
  CourseDescriptionItem,
  CourseDescriptionSettings,
  CourseDescriptionSnapshot,
  CourseDescriptionType,
} from "@/domain/courseDescription/types"

export class CourseDescriptionContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CourseDescriptionContractError"
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CourseDescriptionContractError(`${field} must be an object.`)
  }

  return value as Record<string, unknown>
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new CourseDescriptionContractError(`${field} must be an array.`)
  }

  return value
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new CourseDescriptionContractError(`${field} must be a string.`)
  }

  return value
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new CourseDescriptionContractError(`${field} must be a boolean.`)
  }

  return value
}

function asInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CourseDescriptionContractError(`${field} must be an integer.`)
  }

  return value
}

function asNullableInteger(value: unknown, field: string): number | null {
  return value === null ? null : asInteger(value, field)
}

function asNullableString(value: unknown, field: string): string | null {
  return value === null ? null : asString(value, field)
}

function normalizeType(value: unknown, index: number): CourseDescriptionType {
  const item = asRecord(value, `types[${index}]`)

  return {
    value: asInteger(item.value, `types[${index}].value`),
    label: asString(item.label, `types[${index}].label`),
    icon: asString(item.icon, `types[${index}].icon`),
  }
}

function normalizeItem(value: unknown, index: number): CourseDescriptionItem {
  const item = asRecord(value, `items[${index}]`)
  const progress = asInteger(item.progress, `items[${index}].progress`)

  return {
    iid: asInteger(item.iid, `items[${index}].iid`),
    title: asString(item.title, `items[${index}].title`),
    content: asString(item.content, `items[${index}].content`),
    descriptionType: asInteger(item.descriptionType, `items[${index}].descriptionType`),
    progress: Math.min(100, Math.max(0, progress)),
    resourceNodeId: asNullableInteger(item.resourceNodeId, `items[${index}].resourceNodeId`),
    sessionId: asNullableInteger(item.sessionId, `items[${index}].sessionId`),
    language: asNullableString(item.language, `items[${index}].language`),
    isInheritedFromCourse: asBoolean(
      item.isInheritedFromCourse,
      `items[${index}].isInheritedFromCourse`,
    ),
  }
}

function normalizeSettings(value: unknown): CourseDescriptionSettings {
  const settings = asRecord(value, "settings")

  return {
    searchEnabled: asBoolean(settings.searchEnabled, "settings.searchEnabled"),
    saveTitlesAsHtml: asBoolean(settings.saveTitlesAsHtml, "settings.saveTitlesAsHtml"),
  }
}

export function normalizeCourseDescriptionResponse(value: unknown): CourseDescriptionSnapshot {
  const response = asRecord(value, "response")
  const items = asArray(response.items, "items").map(normalizeItem)
  const totalItems = asInteger(response.totalItems, "totalItems")

  if (totalItems !== items.length) {
    throw new CourseDescriptionContractError("totalItems does not match items.")
  }

  return {
    items,
    totalItems,
    courseId: asInteger(response.courseId, "courseId"),
    sessionId: asNullableInteger(response.sessionId ?? null, "sessionId"),
    studentView: asBoolean(response.studentView, "studentView"),
    types: asArray(response.types, "types").map(normalizeType),
    settings: normalizeSettings(response.settings),
  }
}
