import type { CourseNavigationContext } from "@/domain/courses/types"

export function buildCourseDescriptionApiQuery(
  context: CourseNavigationContext,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    cid: context.courseId,
    isStudentView: true,
  }

  if (context.sessionId) {
    query.sid = context.sessionId
  }

  return query
}
