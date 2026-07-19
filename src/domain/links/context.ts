import type { CourseNavigationContext } from "@/domain/courses/types"

export function buildLinksApiQuery(
  context: CourseNavigationContext,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    cid: context.courseId,
    itemsPerPage: 5000,
  }

  if (context.sessionId) {
    query.sid = context.sessionId
  }

  return query
}
