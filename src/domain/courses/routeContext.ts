import type { RouteLocationRaw } from "vue-router"

import type { CourseNavigationContext, CourseSource } from "@/domain/courses/types"

export class CourseRouteContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CourseRouteContextError"
  }
}

function asPositiveInteger(value: string | null, field: string): number | null {
  if (value === null) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CourseRouteContextError(`Invalid ${field}.`)
  }

  return parsed
}

function asCourseSource(value: string | null): CourseSource {
  if (value === "direct" || value === "session") {
    return value
  }

  throw new CourseRouteContextError("Invalid course source.")
}

function buildContextQuery(context: CourseNavigationContext): Record<string, string> {
  const query: Record<string, string> = {
    source: context.source,
  }

  if (context.sessionId) {
    query.sid = String(context.sessionId)
  }

  if (context.membershipId) {
    query.membership = String(context.membershipId)
  }

  if (context.sessionCourseId) {
    query.sessionCourse = String(context.sessionCourseId)
  }

  return query
}

export function parseCourseRouteContext(input: {
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}): CourseNavigationContext {
  const courseId = asPositiveInteger(input.courseId, "course id")
  const source = asCourseSource(input.source)
  const sessionId = asPositiveInteger(input.sessionId, "session id")
  const membershipId = asPositiveInteger(input.membershipId, "membership id")
  const sessionCourseId = asPositiveInteger(input.sessionCourseId, "session course id")

  if (courseId === null) {
    throw new CourseRouteContextError("Course id is required.")
  }

  if (
    source === "direct" &&
    (membershipId === null || sessionId !== null || sessionCourseId !== null)
  ) {
    throw new CourseRouteContextError("Direct course context is incomplete.")
  }

  if (
    source === "session" &&
    (sessionId === null || sessionCourseId === null || membershipId !== null)
  ) {
    throw new CourseRouteContextError("Session course context is incomplete.")
  }

  return {
    courseId,
    sessionId,
    membershipId,
    sessionCourseId,
    source,
  }
}

export function buildCourseRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "course-home",
    params: {
      courseId: String(context.courseId),
    },
    query: buildContextQuery(context),
  }
}

export function buildNotebookRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "notebook",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

export function buildNotebookFormRoute(
  context: CourseNavigationContext,
  notebookId?: number,
): RouteLocationRaw {
  return {
    name: "notebook-form",
    params: {
      courseId: String(context.courseId),
      ...(notebookId ? { notebookId: String(notebookId) } : {}),
    },
    query: buildContextQuery(context),
  }
}

export function buildAnnouncementsRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "announcements",
    params: {
      courseId: String(context.courseId),
    },
    query: buildContextQuery(context),
  }
}

export function buildCourseProgressRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "course-progress",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

export function buildCourseDescriptionRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "course-description",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

export function buildDocumentsRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "documents",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}
