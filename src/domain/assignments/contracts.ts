import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  AssignmentAvailabilityStatus,
  AssignmentCollection,
  AssignmentComment,
  AssignmentDetail,
  AssignmentSubmission,
  AssignmentSummary,
} from "@/domain/assignments/types"

export class AssignmentContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AssignmentContractError"
  }
}

type UnknownRecord = Record<string, unknown>

export interface AssignmentRequestDefinition {
  path: string
  query: Record<string, string | number | boolean>
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = numeric(value)

  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new AssignmentContractError(`Invalid ${field}.`)
  }

  return parsed
}

function truthyInteger(value: unknown): boolean {
  return numeric(value) !== null && numeric(value)! > 0
}

function nullableText(value: unknown): string | null {
  const normalized = text(value)
  return normalized || null
}

function collectionItems(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value

  if (!isRecord(value)) {
    throw new AssignmentContractError(`The ${label} response is not a collection.`)
  }

  if (Array.isArray(value["hydra:member"])) return value["hydra:member"]
  if (Array.isArray(value.member)) return value.member
  if (Array.isArray(value.items)) return value.items

  throw new AssignmentContractError(`The ${label} response has no collection members.`)
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function plainText(value: unknown): string {
  const html = text(value)
  if (!html) return ""

  return decodeBasicEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function isoDate(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString()
}

function assignmentObject(value: UnknownRecord): UnknownRecord {
  return isRecord(value.assignment) ? value.assignment : {}
}

function allowedExtensions(value: unknown): string[] {
  const raw = text(value)
  if (!raw) return []

  return raw
    .split(/[,;\s]+/)
    .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean)
    .filter((extension, index, source) => source.indexOf(extension) === index)
}

export function resolveAssignmentAvailability(
  dueAt: string | null,
  endsAt: string | null,
  now = new Date(),
): AssignmentAvailabilityStatus {
  if (!dueAt && !endsAt) return "unscheduled"

  const dueDate = dueAt ? new Date(dueAt) : null
  const endsDate = endsAt ? new Date(endsAt) : null

  const dueTime = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.getTime() : null
  const endsTime = endsDate && !Number.isNaN(endsDate.getTime()) ? endsDate.getTime() : null
  const nowTime = now.getTime()

  if (endsTime !== null && nowTime > endsTime) return "closed"
  if (dueTime !== null && nowTime > dueTime) return "late"

  return "open"
}

function normalizeAssignment(value: unknown): AssignmentSummary {
  if (!isRecord(value)) {
    throw new AssignmentContractError("An assignment is invalid.")
  }

  const assignment = assignmentObject(value)
  const dueAt = isoDate(assignment.expiresOn)
  const endsAt = isoDate(assignment.endsOn)

  return {
    id: positiveInteger(value.iid ?? value["@id"], "assignment id"),
    title: text(value.title) || "Assignment",
    description: plainText(value.description),
    publishedAt: isoDate(value.sentDate),
    dueAt,
    endsAt,
    maximumScore: numeric(value.qualification),
    gradebookWeight: numeric(value.weight),
    textSubmissionAllowed: truthyInteger(value.allowTextAssignment),
    allowedExtensions: allowedExtensions(value.extensions),
    availabilityStatus: resolveAssignmentAvailability(dueAt, endsAt),
    submittedStudentCount: Math.max(0, Math.trunc(numeric(value.uniqueStudentAttemptsTotal) ?? 0)),
    lastSubmissionAt: isoDate(value.lastUpload),
  }
}

export function normalizeAssignmentCollection(value: unknown): AssignmentCollection {
  const items = collectionItems(value, "assignments").map(normalizeAssignment)

  return {
    items,
    totalItems: items.length,
  }
}

function normalizeComment(value: unknown): AssignmentComment {
  if (!isRecord(value)) {
    throw new AssignmentContractError("An assignment comment is invalid.")
  }

  const user = isRecord(value.user) ? value.user : {}

  return {
    id: positiveInteger(value.iid ?? value["@id"], "assignment comment id"),
    text: plainText(value.comment),
    sentAt: isoDate(value.sentAt),
    authorName: text(user.fullName) || "Course member",
    fileName: nullableText(value.file),
    downloadUrl: nullableText(value.downloadUrl),
  }
}

export function normalizeAssignmentComments(value: unknown): AssignmentComment[] {
  return collectionItems(value, "assignment comments").map(normalizeComment)
}

function normalizeSubmission(
  value: unknown,
  maximumScore: number | null,
  comments: AssignmentComment[],
): AssignmentSubmission {
  if (!isRecord(value)) {
    throw new AssignmentContractError("An assignment submission is invalid.")
  }

  return {
    id: positiveInteger(value.iid ?? value["@id"], "assignment submission id"),
    title: text(value.title) || "Submission",
    description: plainText(value.description),
    sentAt: isoDate(value.sentDate),
    score: numeric(value.qualification),
    maximumScore,
    hasFile: truthyInteger(value.containsFile) || Boolean(text(value.downloadUrl)),
    downloadUrl: nullableText(value.downloadUrl),
    correctionTitle: nullableText(value.correctionTitle),
    correctionDownloadUrl: nullableText(value.correctionDownloadUrl),
    comments,
  }
}

export function normalizeAssignmentDetail(
  assignmentValue: unknown,
  submissionsValue: unknown,
  commentsBySubmissionId: ReadonlyMap<number, AssignmentComment[]>,
): AssignmentDetail {
  const assignment = normalizeAssignment(assignmentValue)

  const submissions = collectionItems(submissionsValue, "assignment submissions").map((value) => {
    if (!isRecord(value)) {
      throw new AssignmentContractError("An assignment submission is invalid.")
    }

    const submissionId = positiveInteger(value.iid ?? value["@id"], "assignment submission id")

    return normalizeSubmission(
      value,
      assignment.maximumScore,
      commentsBySubmissionId.get(submissionId) ?? [],
    )
  })

  return {
    assignment,
    submissions,
  }
}

function contextQuery(context: CourseNavigationContext): Record<string, string | number> {
  return {
    cid: context.courseId,
    ...(context.sessionId ? { sid: context.sessionId } : {}),
  }
}

export function buildAssignmentsRequest(
  context: CourseNavigationContext,
): AssignmentRequestDefinition {
  return {
    path: "/assignments/student",
    query: contextQuery(context),
  }
}

export function buildAssignmentRequest(
  context: CourseNavigationContext,
  assignmentId: number,
): AssignmentRequestDefinition {
  return {
    path: `/api/c_student_publications/${positiveInteger(assignmentId, "assignment id")}`,
    query: contextQuery(context),
  }
}

export function buildAssignmentSubmissionsRequest(
  context: CourseNavigationContext,
  assignmentId: number,
): AssignmentRequestDefinition {
  return {
    path: `/assignments/${positiveInteger(assignmentId, "assignment id")}/submissions`,
    query: {
      ...contextQuery(context),
      page: 1,
      itemsPerPage: 100,
      "order[sentDate]": "desc",
    },
  }
}

export function buildAssignmentCommentsRequest(
  context: CourseNavigationContext,
  submissionId: number,
): AssignmentRequestDefinition {
  return {
    path: "/api/c_student_publication_comments",
    query: {
      ...contextQuery(context),
      "publication.iid": positiveInteger(submissionId, "submission id"),
      itemsPerPage: 5000,
    },
  }
}
