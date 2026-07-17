import type { CourseHomeEntry, ToolCapability } from "@/domain/courseHome/types"
import {
  buildAnnouncementsRoute,
  buildNotebookRoute,
  buildCourseProgressRoute,
} from "@/domain/courses/routeContext"

export function createCourseToolCapabilities(entry: CourseHomeEntry): ToolCapability[] {
  if (entry.accessState !== "available") {
    return []
  }

  return [
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
      toolKey: "course-progress",
      titleKey: "courseHome.tools.courseProgress.title",
      descriptionKey: "courseHome.tools.courseProgress.description",
      icon: "pi pi-chart-line",
      available: true,
      readOnly: true,
      reason: null,
      route: buildCourseProgressRoute(entry.context),
      apiContract: { list: "GET /api/course-progress/list", context: ["cid", "sid", "gid"] },
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
}
