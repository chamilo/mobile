import type { CourseNavigationContext } from "@/domain/courses/types"
export function buildCourseProgressApiQuery(context: CourseNavigationContext) {
  return { cid: context.courseId, sid: context.sessionId, gid: null, isStudentView: true }
}
