import type { RouteLocationRaw } from "vue-router"

import type { CourseNavigationContext, CourseSource } from "@/domain/courses/types"
import type { SurveyOpenMode } from "@/domain/surveys/types"

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

export function buildCourseLinksRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "course-links",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

export function buildAgendaRoute(context: CourseNavigationContext): RouteLocationRaw {
  return {
    name: "agenda",
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

function buildAcceleratedToolRoute(
  name: string,
  context: CourseNavigationContext,
): RouteLocationRaw {
  return {
    name,
    params: { courseId: String(context.courseId) },
    query: buildContextQuery(context),
  }
}

export const buildLearningPathsRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("learning-paths", context)

export function buildLearningPathDetailRoute(
  context: CourseNavigationContext,
  learningPathId: number,
  learningPathTitle?: string,
): RouteLocationRaw {
  return {
    name: "learning-path-detail",
    params: {
      courseId: String(context.courseId),
      learningPathId: String(learningPathId),
    },
    query: {
      ...buildContextQuery(context),
      ...(learningPathTitle ? { learningPathTitle } : {}),
    },
  }
}

export const buildExercisesRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("exercises", context)

export function buildExercisePlayerRoute(
  context: CourseNavigationContext,
  exerciseId: number,
): RouteLocationRaw {
  return {
    name: "exercise-player",
    params: {
      courseId: String(context.courseId),
      exerciseId: String(exerciseId),
    },
    query: buildContextQuery(context),
  }
}

export function buildExerciseResultRoute(
  context: CourseNavigationContext,
  exerciseId: number,
  attemptId: number,
): RouteLocationRaw {
  return {
    name: "exercise-result",
    params: {
      courseId: String(context.courseId),
      exerciseId: String(exerciseId),
      attemptId: String(attemptId),
    },
    query: buildContextQuery(context),
  }
}

export const buildForumsRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("forums", context)

export function buildForumThreadsRoute(
  context: CourseNavigationContext,
  forumId: number,
  forumTitle?: string,
): RouteLocationRaw {
  return {
    name: "forum-threads",
    params: {
      courseId: String(context.courseId),
      forumId: String(forumId),
    },
    query: {
      ...buildContextQuery(context),
      ...(forumTitle ? { forumTitle } : {}),
    },
  }
}

export function buildForumThreadRoute(
  context: CourseNavigationContext,
  forumId: number,
  threadId: number,
  forumTitle?: string,
  threadTitle?: string,
): RouteLocationRaw {
  return {
    name: "forum-thread",
    params: {
      courseId: String(context.courseId),
      forumId: String(forumId),
      threadId: String(threadId),
    },
    query: {
      ...buildContextQuery(context),
      ...(forumTitle ? { forumTitle } : {}),
      ...(threadTitle ? { threadTitle } : {}),
    },
  }
}

export const buildAssignmentsRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("assignments", context)

export function buildAssignmentDetailRoute(
  context: CourseNavigationContext,
  assignmentId: number,
  assignmentTitle?: string,
): RouteLocationRaw {
  return {
    name: "assignment-detail",
    params: {
      courseId: String(context.courseId),
      assignmentId: String(assignmentId),
    },
    query: {
      ...buildContextQuery(context),
      ...(assignmentTitle ? { assignmentTitle } : {}),
    },
  }
}

export const buildSurveysRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("surveys", context)

export function buildSurveyDetailRoute(
  context: CourseNavigationContext,
  surveyId: number,
  mode: SurveyOpenMode,
  surveyTitle?: string,
  invitationLpItemId = 0,
): RouteLocationRaw {
  return {
    name: "survey-detail",
    params: {
      courseId: String(context.courseId),
      surveyId: String(surveyId),
    },
    query: {
      ...buildContextQuery(context),
      mode,
      ...(surveyTitle ? { surveyTitle } : {}),
      ...(invitationLpItemId > 0 ? { lpItemId: String(invitationLpItemId) } : {}),
    },
  }
}

export const buildGradebookRoute = (context: CourseNavigationContext) =>
  buildAcceleratedToolRoute("gradebook", context)
