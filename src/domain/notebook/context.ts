import type { CourseNavigationContext } from "@/domain/courses/types"

export function buildNotebookApiQuery(
  context: CourseNavigationContext,
  studentView = false,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    cid: context.courseId,
    isStudentView: studentView,
  }

  if (context.sessionId) {
    query.sid = context.sessionId
  }

  return query
}
