import type { CourseNavigationContext, CoursesOverview } from "@/domain/courses/types"

export function findCourseLanguage(
  overview: CoursesOverview,
  context: CourseNavigationContext | null | undefined,
): string | null {
  if (!context) return null

  if (context.source === "direct") {
    return (
      overview.directCourses.find(
        (enrollment) =>
          enrollment.course.id === context.courseId &&
          (context.membershipId === null || enrollment.membershipId === context.membershipId),
      )?.course.language ?? null
    )
  }

  const sessions = [
    ...overview.currentSessions,
    ...overview.upcomingSessions,
    ...overview.pastSessions,
  ]
  const session = sessions.find((candidate) => candidate.id === context.sessionId)
  if (!session) return null

  return (
    session.courses.find(
      (enrollment) =>
        enrollment.course.id === context.courseId &&
        (context.sessionCourseId === null ||
          enrollment.sessionCourseId === context.sessionCourseId),
    )?.course.language ?? null
  )
}
