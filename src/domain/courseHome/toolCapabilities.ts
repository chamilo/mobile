import type { CourseHomeEntry, CourseToolKey, ToolCapability } from "@/domain/courseHome/types"
import {
  buildAgendaRoute,
  buildAnnouncementsRoute,
  buildNotebookRoute,
  buildCourseProgressRoute,
  buildCourseDescriptionRoute,
  buildDocumentsRoute,
  buildCourseLinksRoute,
  buildAssignmentsRoute,
  buildExercisesRoute,
  buildForumsRoute,
  buildGradebookRoute,
  buildLearningPathsRoute,
  buildSurveysRoute,
} from "@/domain/courses/routeContext"

export function createCourseToolCapabilities(
  entry: CourseHomeEntry,
  availableTools: readonly CourseToolKey[],
): ToolCapability[] {
  if (entry.accessState !== "available") {
    return []
  }

  const availableToolSet = new Set(availableTools)

  const capabilities: ToolCapability[] = [
    {
      toolKey: "agenda",
      titleKey: "courseHome.tools.agenda.title",
      descriptionKey: "courseHome.tools.agenda.description",
      icon: "pi pi-calendar",
      available: true,
      readOnly: true,
      reason: null,
      route: buildAgendaRoute(entry.context),
      apiContract: {
        list: "GET /api/c_calendar_events",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "announcements",
      titleKey: "courseHome.tools.announcements.title",
      descriptionKey: "courseHome.tools.announcements.description",
      icon: "pi pi-megaphone",
      available: true,
      readOnly: true,
      reason: null,
      route: buildAnnouncementsRoute(entry.context),
      apiContract: {
        list: "GET /api/announcement/list",
        detail: "GET /api/announcement/{id}",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "course-description",
      titleKey: "courseHome.tools.courseDescription.title",
      descriptionKey: "courseHome.tools.courseDescription.description",
      icon: "pi pi-align-left",
      available: true,
      readOnly: true,
      reason: null,
      route: buildCourseDescriptionRoute(entry.context),
      apiContract: {
        list: "GET /api/course-description/list",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "documents",
      titleKey: "courseHome.tools.documents.title",
      descriptionKey: "courseHome.tools.documents.description",
      icon: "pi pi-folder-open",
      available: true,
      readOnly: true,
      reason: null,
      route: buildDocumentsRoute(entry.context),
      apiContract: {
        list: "GET /api/documents",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "links",
      titleKey: "courseHome.tools.links.title",
      descriptionKey: "courseHome.tools.links.description",
      icon: "pi pi-link",
      available: true,
      readOnly: true,
      reason: null,
      route: buildCourseLinksRoute(entry.context),
      apiContract: {
        list: "GET /api/links",
        detail: "GET /api/links/{iid}/details",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "course-progress",
      titleKey: "courseHome.tools.courseProgress.title",
      descriptionKey: "courseHome.tools.courseProgress.description",
      icon: "pi pi-chart-line",
      available: true,
      readOnly: true,
      reason: null,
      route: buildCourseProgressRoute(entry.context),
      apiContract: {
        list: "GET /api/course-progress/list",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "learning-paths",
      titleKey: "courseHome.tools.learningPaths.title",
      descriptionKey: "courseHome.tools.learningPaths.description",
      icon: "pi pi-sitemap",
      available: true,
      readOnly: true,
      reason: null,
      route: buildLearningPathsRoute(entry.context),
      apiContract: {
        list: "GET /api/learning_paths",
        detail: "GET /api/learning_paths/{lpId}/runtime",
        context: ["cid", "sid", "gid", "resourceNode.parent"],
      },
    },
    {
      toolKey: "exercises",
      titleKey: "courseHome.tools.exercises.title",
      descriptionKey: "courseHome.tools.exercises.description",
      icon: "pi pi-check-square",
      available: true,
      readOnly: false,
      reason: null,
      route: buildExercisesRoute(entry.context),
      apiContract: {
        list: "GET /api/exercise/list",
        detail: "GET /api/exercise/runtime/{exerciseId}",
        context: ["cid", "sid", "gid"],
      },
    },
    {
      toolKey: "forums",
      titleKey: "courseHome.tools.forums.title",
      descriptionKey: "courseHome.tools.forums.description",
      icon: "pi pi-comments",
      available: true,
      readOnly: true,
      reason: null,
      route: buildForumsRoute(entry.context),
      apiContract: {
        list: "GET /api/forum_categories + GET /api/forums",
        detail:
          "GET /api/forum_threads?forum=/api/forums/{forumId} + GET /api/forum_threads/{threadId}/posts",
        context: ["cid", "sid", "gid", "resourceNode.parent"],
      },
    },
    {
      toolKey: "assignments",
      titleKey: "courseHome.tools.assignments.title",
      descriptionKey: "courseHome.tools.assignments.description",
      icon: "pi pi-upload",
      available: true,
      readOnly: true,
      reason: null,
      route: buildAssignmentsRoute(entry.context),
      apiContract: {
        list: "GET /assignments/student",
        detail:
          "GET /api/c_student_publications/{assignmentId} + GET /assignments/{assignmentId}/submissions",
        context: ["cid", "sid"],
      },
    },
    {
      toolKey: "surveys",
      titleKey: "courseHome.tools.surveys.title",
      descriptionKey: "courseHome.tools.surveys.description",
      icon: "pi pi-list-check",
      available: true,
      readOnly: true,
      reason: null,
      route: buildSurveysRoute(entry.context),
      apiContract: {
        list: "GET /api/survey/list",
        detail: "GET /api/survey/answer/{surveyId}",
        context: ["cid", "sid", "gid", "lpItemId"],
      },
    },
    {
      toolKey: "gradebook",
      titleKey: "courseHome.tools.gradebook.title",
      descriptionKey: "courseHome.tools.gradebook.description",
      icon: "pi pi-chart-bar",
      available: true,
      readOnly: true,
      reason: null,
      route: buildGradebookRoute(entry.context),
      apiContract: {
        list: "GET /api/tracking/user_gradebook_result_in_course_and_session",
        detail: "GET /api/tracking/user_certificates_in_course_and_session",
        context: ["userId", "courseId", "sessionId"],
      },
    },
    {
      toolKey: "notebook",
      titleKey: "courseHome.tools.notebook.title",
      descriptionKey: "courseHome.tools.notebook.description",
      icon: "pi pi-book",
      available: true,
      readOnly: false,
      reason: null,
      route: buildNotebookRoute(entry.context),
      apiContract: {
        list: "GET /api/notebook/list",
        detail: "GET /api/notebook/form",
        context: ["cid", "sid", "gid"],
      },
    },
  ]

  return capabilities.filter(({ toolKey }) => availableToolSet.has(toolKey))
}
