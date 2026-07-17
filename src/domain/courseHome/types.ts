import type { RouteLocationRaw } from "vue-router"

import type {
  CourseNavigationContext,
  CourseRole,
  CourseSummary,
  SessionPeriod,
} from "@/domain/courses/types"

export type CourseHomeAccessState = "available" | "denied" | "closed"
export type CourseToolKey =
  | "announcements"
  | "course-description"
  | "course-progress"
  | "documents"
  | "links"
  | "notebook"

export interface CourseHomeEntry {
  course: CourseSummary
  context: CourseNavigationContext
  role: CourseRole
  progress: number | null
  sessionTitle: string | null
  sessionPeriod: SessionPeriod | null
  accessState: CourseHomeAccessState
}

export interface ToolCapabilityContract {
  list: string
  detail?: string
  context: readonly string[]
}

export interface ToolCapability {
  toolKey: CourseToolKey
  titleKey: string
  descriptionKey: string
  icon: string
  available: boolean
  readOnly: boolean
  reason: string | null
  route: RouteLocationRaw
  apiContract: ToolCapabilityContract
}
