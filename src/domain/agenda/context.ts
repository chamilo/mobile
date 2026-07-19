import type { CourseNavigationContext } from "@/domain/courses/types"

export function buildAgendaApiQuery(
  context: CourseNavigationContext,
): Record<string, string | number> {
  const currentYear = new Date().getUTCFullYear()
  const query: Record<string, string | number> = {
    cid: context.courseId,
    "startDate[after]": `${currentYear - 1}-01-01T00:00:00+00:00`,
    "endDate[before]": `${currentYear + 1}-12-31T23:59:59+00:00`,
    itemsPerPage: 5000,
  }

  if (context.sessionId) {
    query.sid = context.sessionId
  }

  return query
}
