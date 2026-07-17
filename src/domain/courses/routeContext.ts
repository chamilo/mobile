import type { RouteLocationRaw } from "vue-router"

import type { CourseNavigationContext } from "@/domain/courses/types"

export function buildCourseRoute(context: CourseNavigationContext): RouteLocationRaw {
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

  return {
    name: "course-home",
    params: {
      courseId: String(context.courseId),
    },
    query,
  }
}
