import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  GradebookCertificate,
  GradebookOverview,
  GradebookSummary,
} from "@/domain/gradebook/types"

export class GradebookContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GradebookContractError"
  }
}

type UnknownRecord = Record<string, unknown>

export interface GradebookRequestDefinition {
  path: string
  query: Record<string, string | number>
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = numeric(value)

  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new GradebookContractError(`Invalid ${field}.`)
  }

  return parsed
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

function collectionItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  if (!isRecord(value)) {
    throw new GradebookContractError("The certificate response is not a collection.")
  }

  if (Array.isArray(value["hydra:member"])) return value["hydra:member"]
  if (Array.isArray(value.member)) return value.member
  if (Array.isArray(value.items)) return value.items

  throw new GradebookContractError("The certificate response has no collection members.")
}

function trackingQuery(context: CourseNavigationContext, userId: number): Record<string, number> {
  return {
    userId: positiveInteger(userId, "user id"),
    courseId: positiveInteger(context.courseId, "course id"),
    ...(context.sessionId ? { sessionId: positiveInteger(context.sessionId, "session id") } : {}),
  }
}

export function buildGradebookSummaryRequest(
  context: CourseNavigationContext,
  userId: number,
): GradebookRequestDefinition {
  return {
    path: "/api/tracking/user_gradebook_result_in_course_and_session",
    query: trackingQuery(context, userId),
  }
}

export function buildGradebookCertificatesRequest(
  context: CourseNavigationContext,
  userId: number,
): GradebookRequestDefinition {
  return {
    path: "/api/tracking/user_certificates_in_course_and_session",
    query: trackingQuery(context, userId),
  }
}

export function normalizeGradebookSummary(value: unknown): GradebookSummary {
  if (!isRecord(value)) {
    throw new GradebookContractError("The gradebook summary response is invalid.")
  }

  const score = numeric(value.score) ?? 0
  const maximumScore = numeric(value.max) ?? 0
  const percentage = numeric(value.percentage) ?? 0
  const minimumPercentage = numeric(value.min) ?? 0
  const hasResult = maximumScore > 0

  return {
    score,
    maximumScore,
    percentage,
    minimumPercentage,
    hasResult,
    thresholdMet: hasResult && minimumPercentage > 0 ? percentage >= minimumPercentage : null,
  }
}

function normalizeCertificate(value: unknown): GradebookCertificate {
  if (!isRecord(value)) {
    throw new GradebookContractError("A gradebook certificate is invalid.")
  }

  return {
    id: positiveInteger(value.id ?? value["@id"], "certificate id"),
    title: plainText(value.title) || "Course certificate",
    issuedAt: isoDate(value.issuedAt),
    downloadAvailable: Boolean(text(value.downloadUrl)),
  }
}

export function normalizeGradebookCertificates(value: unknown): GradebookCertificate[] {
  return collectionItems(value).map(normalizeCertificate)
}

export function normalizeGradebookOverview(
  summaryValue: unknown,
  certificateValue: unknown,
): GradebookOverview {
  return {
    summary: normalizeGradebookSummary(summaryValue),
    certificates: normalizeGradebookCertificates(certificateValue),
  }
}
