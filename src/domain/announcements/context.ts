import type { RouteLocationRaw } from "vue-router"

import type { CourseNavigationContext } from "@/domain/courses/types"
import { buildCourseRoute } from "@/domain/courses/routeContext"

export function buildAnnouncementApiQuery(
  context: CourseNavigationContext,
): Record<string, string | number | boolean> {
  return {
    cid: context.courseId,
    ...(context.sessionId ? { sid: context.sessionId } : {}),
    isStudentView: true,
  }
}

export function buildAnnouncementContextKey(context: CourseNavigationContext): string {
  return [
    `course-${context.courseId}`,
    `session-${context.sessionId ?? 0}`,
    `source-${context.source}`,
    `membership-${context.membershipId ?? 0}`,
    `session-course-${context.sessionCourseId ?? 0}`,
  ].join("-")
}

export function buildAnnouncementListRoute(context: CourseNavigationContext): RouteLocationRaw {
  const courseRoute = buildCourseRoute(context) as {
    params?: Record<string, string>
    query?: Record<string, string>
  }

  return {
    name: "announcements",
    params: courseRoute.params,
    query: courseRoute.query,
  }
}

export function buildAnnouncementDetailRoute(
  context: CourseNavigationContext,
  announcementId: number,
): RouteLocationRaw {
  const courseRoute = buildCourseRoute(context) as {
    params?: Record<string, string>
    query?: Record<string, string>
  }

  return {
    name: "announcement-detail",
    params: {
      ...courseRoute.params,
      announcementId: String(announcementId),
    },
    query: courseRoute.query,
  }
}
