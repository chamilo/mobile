import type { CourseHomeEntry, ToolCapability } from "@/domain/courseHome/types"
import { buildAnnouncementsRoute } from "@/domain/courses/routeContext"

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
  ]
}
