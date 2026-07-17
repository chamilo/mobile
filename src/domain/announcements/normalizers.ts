import type {
  AnnouncementAttachment,
  AnnouncementAuthor,
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
  AnnouncementSummary,
} from "@/domain/announcements/types"
import type { CourseNavigationContext } from "@/domain/courses/types"

export class AnnouncementContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AnnouncementContractError"
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AnnouncementContractError(`The campus returned an invalid ${field}.`)
  }

  return value as Record<string, unknown>
}

function asPositiveInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AnnouncementContractError(`The campus returned an invalid ${field}.`)
  }

  return parsed
}

function asNonNegativeInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AnnouncementContractError(`The campus returned an invalid ${field}.`)
  }

  return parsed
}

function asNullablePositiveInteger(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === 0 || value === "0") {
    return null
  }

  return asPositiveInteger(value, field)
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNullableDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw new AnnouncementContractError(`The campus returned an invalid ${field}.`)
  }

  return value
}

function normalizeAuthor(value: unknown): AnnouncementAuthor | null {
  if (value === null || value === undefined) {
    return null
  }

  const record = asRecord(value, "announcement author")
  const username = asString(record.username).trim()
  const fullName = asString(record.fullName).trim()

  return {
    id: asPositiveInteger(record.id, "announcement author id"),
    username,
    fullName: fullName || username,
  }
}

function normalizeSummary(value: unknown): AnnouncementSummary {
  const record = asRecord(value, "announcement item")
  const title = asString(record.title).trim()

  return {
    id: asPositiveInteger(record.id, "announcement id"),
    title: title || "Announcement",
    author: normalizeAuthor(record.author),
    createdAt: asNullableDate(record.createdAt, "announcement created date"),
    updatedAt: asNullableDate(record.updatedAt, "announcement updated date"),
    emailSent: asBoolean(record.emailSent),
    hasAttachments: asBoolean(record.hasAttachments),
    attachmentCount: asNonNegativeInteger(record.attachmentCount ?? 0, "attachment count"),
    displayOrder: asNonNegativeInteger(record.displayOrder ?? 0, "announcement order"),
  }
}

function normalizeAttachment(value: unknown): AnnouncementAttachment {
  const record = asRecord(value, "announcement attachment")
  const downloadUrl = asString(record.downloadUrl).trim()

  if (!downloadUrl.startsWith("/api/announcement/")) {
    throw new AnnouncementContractError("The campus returned an invalid attachment URL.")
  }

  return {
    id: asPositiveInteger(record.id, "attachment id"),
    filename: asString(record.filename, "Attachment").trim() || "Attachment",
    comment: asString(record.comment),
    size: asNonNegativeInteger(record.size ?? 0, "attachment size"),
    downloadUrl,
  }
}

function assertMatchingContext(
  response: Record<string, unknown>,
  context: CourseNavigationContext,
): void {
  const courseId = asPositiveInteger(response.courseId, "announcement course id")
  const sessionId = asNullablePositiveInteger(response.sessionId, "announcement session id")
  const groupId = asNullablePositiveInteger(response.groupId, "announcement group id")

  if (courseId !== context.courseId || sessionId !== context.sessionId || groupId !== null) {
    throw new AnnouncementContractError("The campus returned announcements for another context.")
  }
}

export function normalizeAnnouncementListResponse(
  value: unknown,
  context: CourseNavigationContext,
): AnnouncementListSnapshot {
  const response = asRecord(value, "announcement list")
  assertMatchingContext(response, context)

  if (!Array.isArray(response.items)) {
    throw new AnnouncementContractError("The campus returned an invalid announcement list.")
  }

  const items = response.items.map(normalizeSummary)
  const totalItems = asNonNegativeInteger(response.totalItems ?? items.length, "announcement total")

  if (totalItems !== items.length) {
    throw new AnnouncementContractError("The announcement total does not match the returned list.")
  }

  return {
    context: structuredClone(context),
    items,
    totalItems,
    fetchedAt: new Date().toISOString(),
  }
}

export function normalizeAnnouncementDetailResponse(
  value: unknown,
  context: CourseNavigationContext,
  expectedAnnouncementId: number,
): AnnouncementDetailSnapshot {
  const response = asRecord(value, "announcement detail")
  assertMatchingContext(response, context)

  const responseId = asPositiveInteger(response.id, "announcement response id")
  const item = asRecord(response.item, "announcement detail item")
  const summary = normalizeSummary({
    ...item,
    hasAttachments: Array.isArray(item.attachments) && item.attachments.length > 0,
    attachmentCount: Array.isArray(item.attachments) ? item.attachments.length : 0,
  })

  if (responseId !== expectedAnnouncementId || summary.id !== expectedAnnouncementId) {
    throw new AnnouncementContractError("The campus returned another announcement.")
  }

  const attachments = Array.isArray(item.attachments)
    ? item.attachments.map(normalizeAttachment)
    : []

  return {
    context: structuredClone(context),
    item: {
      ...summary,
      contentHtml: asString(item.content),
      language: asString(item.language).trim() || null,
      attachments,
    },
    fetchedAt: new Date().toISOString(),
  }
}
