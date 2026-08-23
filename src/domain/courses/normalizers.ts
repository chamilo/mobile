import type {
  CourseRole,
  CourseSession,
  CourseSummary,
  CourseTeacher,
  DirectCourseEnrollment,
  HydraCollection,
  SessionCourseEnrollment,
  SessionPeriod,
} from "@/domain/courses/types"

export class CourseContractError extends Error {
  constructor(message = "The campus returned an invalid courses response.") {
    super(message)
    this.name = "CourseContractError"
  }
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  return value
}

function asNonNegativeInteger(value: unknown): number | null {
  const number = asFiniteNumber(value)

  return number !== null && Number.isInteger(number) && number >= 0 ? number : null
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

export function extractNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const match = value.match(/\/(\d+)(?:\.[^/?#]+)?(?:[?#].*)?$/)

  if (!match?.[1]) {
    return null
  }

  const parsed = Number.parseInt(match[1], 10)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function normalizeHydraCollection<TItem>(value: unknown): HydraCollection<TItem> {
  if (!isRecord(value) || !Array.isArray(value["hydra:member"])) {
    throw new CourseContractError("The campus response is not a Hydra collection.")
  }

  return value as unknown as HydraCollection<TItem>
}

function normalizeCourse(value: unknown): CourseSummary {
  if (!isRecord(value)) {
    throw new CourseContractError("A course entry is missing its course object.")
  }

  const iri = asString(value["@id"])
  const id = extractNumericId(value.id) ?? extractNumericId(iri)
  const title = asString(value.title)

  if (!iri || !id || !title) {
    throw new CourseContractError("A course entry is missing its identity or title.")
  }

  return {
    id,
    iri,
    title,
    code: asString(value.code),
    language: asString(value.courseLanguage),
    description: asString(value.description),
    illustrationUrl: asString(value.illustrationUrl),
  }
}

function normalizeTeachers(value: unknown): CourseTeacher[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((teacher): CourseTeacher[] => {
    if (!isRecord(teacher)) {
      return []
    }

    const id = extractNumericId(teacher.id) ?? extractNumericId(teacher["@id"])
    const fullName = asString(teacher.fullName)

    if (!id || !fullName) {
      return []
    }

    return [
      {
        id,
        fullName,
        illustrationUrl: asString(teacher.illustrationUrl),
      },
    ]
  })
}

function normalizeRole(status: unknown): CourseRole {
  if (status === 1) {
    return "teacher"
  }

  if (status === 5) {
    return "student"
  }

  return "unknown"
}

function normalizeProgress(item: UnknownRecord): number | null {
  const trackingProgress = asFiniteNumber(item.trackingProgress)
  const persistedProgress = asFiniteNumber(item.progress)
  const progress = trackingProgress ?? persistedProgress

  if (progress === null) {
    return null
  }

  return Math.min(100, Math.max(0, Math.round(progress)))
}

function normalizeScore(value: unknown): number | null {
  const score = asFiniteNumber(value)

  return score === null ? null : Math.round(score * 100) / 100
}

export function normalizeDirectCourseEnrollment(value: unknown): DirectCourseEnrollment {
  if (!isRecord(value)) {
    throw new CourseContractError("A direct course enrollment is invalid.")
  }

  const membershipIri = asString(value["@id"])
  const membershipId = extractNumericId(membershipIri)
  const course = normalizeCourse(value.course)

  if (!membershipIri || !membershipId) {
    throw new CourseContractError("A direct course enrollment is missing its identity.")
  }

  return {
    key: `direct:${membershipId}`,
    source: "direct",
    membershipId,
    membershipIri,
    course,
    role: normalizeRole(value.status),
    progress: normalizeProgress(value),
    score: normalizeScore(value.score),
    bestScore: normalizeScore(value.bestScore),
    timeSpentSeconds: asNonNegativeInteger(value.timeSpentSeconds),
    completed: asBoolean(value.completed),
    certificateAvailable: asBoolean(value.certificateAvailable),
    hasNewContent: asBoolean(value.hasNewContent),
    hasRequirements: asBoolean(value.hasRequirements),
    accessAllowed: asBoolean(value.allowSubscription, true),
    teachers: normalizeTeachers(value.teachersLite),
    context: {
      courseId: course.id,
      sessionId: null,
      membershipId,
      sessionCourseId: null,
      source: "direct",
    },
  }
}

function normalizeSessionCourse(value: unknown, sessionId: number): SessionCourseEnrollment {
  if (!isRecord(value)) {
    throw new CourseContractError("A session course enrollment is invalid.")
  }

  const sessionCourseIri = asString(value["@id"])
  const sessionCourseId = extractNumericId(sessionCourseIri)
  const course = normalizeCourse(value.course)

  if (!sessionCourseIri || !sessionCourseId) {
    throw new CourseContractError("A session course enrollment is missing its identity.")
  }

  return {
    key: `session:${sessionId}:${sessionCourseId}`,
    source: "session",
    sessionCourseId,
    sessionCourseIri,
    course,
    progress: normalizeProgress(value),
    score: normalizeScore(value.score),
    bestScore: normalizeScore(value.bestScore),
    timeSpentSeconds: asNonNegativeInteger(value.timeSpentSeconds),
    completed: asNullableBoolean(value.completed),
    certificateAvailable: asNullableBoolean(value.certificateAvailable),
    context: {
      courseId: course.id,
      sessionId,
      membershipId: null,
      sessionCourseId,
      source: "session",
    },
  }
}

export function normalizeCourseSession(value: unknown, period: SessionPeriod): CourseSession {
  if (!isRecord(value)) {
    throw new CourseContractError("A session entry is invalid.")
  }

  const iri = asString(value["@id"])
  const id = extractNumericId(value.id) ?? extractNumericId(iri)
  const title = asString(value.title)

  if (!iri || !id || !title) {
    throw new CourseContractError("A session entry is missing its identity or title.")
  }

  const courses = Array.isArray(value.courses)
    ? value.courses.map((course) => normalizeSessionCourse(course, id))
    : []

  return {
    id,
    iri,
    title,
    period,
    displayStartDate: asString(value.displayStartDate),
    displayEndDate: asString(value.displayEndDate),
    durationDays: asFiniteNumber(value.duration),
    daysLeft: asFiniteNumber(value.daysLeft),
    accessVisibility: asFiniteNumber(value.accessVisibility),
    courses,
  }
}
