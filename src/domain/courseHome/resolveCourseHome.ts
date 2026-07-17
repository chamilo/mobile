import type { CourseHomeEntry } from "@/domain/courseHome/types"
import type { CourseNavigationContext, CoursesOverview } from "@/domain/courses/types"

export function resolveCourseHomeEntry(
  overview: CoursesOverview,
  context: CourseNavigationContext,
): CourseHomeEntry | null {
  if (context.source === "direct") {
    if (context.membershipId === null || context.sessionId !== null) {
      return null
    }

    const enrollment = overview.directCourses.find(
      (item) => item.membershipId === context.membershipId && item.course.id === context.courseId,
    )

    if (!enrollment) {
      return null
    }

    let accessState: CourseHomeEntry["accessState"] = "available"

    if (!enrollment.accessAllowed) {
      accessState = enrollment.hasRequirements ? "denied" : "closed"
    }

    return {
      course: enrollment.course,
      context: enrollment.context,
      role: enrollment.role,
      progress: enrollment.progress,
      sessionTitle: null,
      sessionPeriod: null,
      accessState,
    }
  }

  if (
    context.sessionId === null ||
    context.sessionCourseId === null ||
    context.membershipId !== null
  ) {
    return null
  }

  const sessions = [
    ...overview.currentSessions,
    ...overview.upcomingSessions,
    ...overview.pastSessions,
  ]
  const session = sessions.find((item) => item.id === context.sessionId)

  if (!session) {
    return null
  }

  const enrollment = session.courses.find(
    (item) =>
      item.sessionCourseId === context.sessionCourseId && item.course.id === context.courseId,
  )

  if (!enrollment) {
    return null
  }

  return {
    course: enrollment.course,
    context: enrollment.context,
    role: "unknown",
    progress: null,
    sessionTitle: session.title,
    sessionPeriod: session.period,
    accessState: "available",
  }
}
