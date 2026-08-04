import type { CourseHomeEntry, CourseToolKey } from "@/domain/courseHome/types"
import type { CourseNavigationContext } from "@/domain/courses/types"

export type OfflineCoursePackToolKey = "course-home" | CourseToolKey

export type OfflineCoursePackStatus = "ready" | "partial" | "error"

export type OfflineCoursePackCompatibility =
  | "available_offline"
  | "read_only_offline"
  | "requires_online_start"
  | "metadata_only"

export interface OfflineCoursePackToolOption {
  key: OfflineCoursePackToolKey
  compatibility: OfflineCoursePackCompatibility
  selectedByDefault: boolean
}

export interface OfflineCoursePackFailure {
  tool: OfflineCoursePackToolKey
  code: string
  message: string
}

export interface OfflineCoursePackWarning {
  tool: OfflineCoursePackToolKey
  code: string
  message: string
}

export interface OfflineCoursePackManifest {
  version: 1
  campusId: string
  userId: number
  courseKey: string
  courseTitle: string
  context: CourseNavigationContext
  selectedTools: OfflineCoursePackToolKey[]
  completedTools: OfflineCoursePackToolKey[]
  failures: OfflineCoursePackFailure[]
  warnings: OfflineCoursePackWarning[]
  scormScopes: string[]
  status: OfflineCoursePackStatus
  resourceCount: number
  downloadedBytes: number
  savedAt: string
  updatedAt: string
}

export type OfflineCoursePackProgressStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "partial"
  | "error"
  | "removing"
  | "cancelled"

export interface OfflineCoursePackProgress {
  status: OfflineCoursePackProgressStatus
  currentTool: OfflineCoursePackToolKey | null
  currentResource: string
  completedTools: number
  totalTools: number
  completedResources: number
  downloadedBytes: number
  cancelRequested: boolean
}

export interface OfflineAccountDataSnapshot {
  version: 1
  preparedAt: string
  messageCount: number
}

export interface OfflineStorageEstimate {
  usage: number | null
  quota: number | null
}

export function buildOfflineCoursePackKey(context: CourseNavigationContext): string {
  return [
    context.courseId,
    context.sessionId ?? 0,
    context.membershipId ?? 0,
    context.sessionCourseId ?? 0,
    context.source,
  ].join(":")
}

export function buildOfflineCoursePackSnapshotKey(context: CourseNavigationContext): string {
  return `course-pack:${buildOfflineCoursePackKey(context)}`
}

export function coursePackEntryTitle(entry: CourseHomeEntry): string {
  return entry.sessionTitle ? `${entry.course.title} · ${entry.sessionTitle}` : entry.course.title
}

export const OFFLINE_COURSE_PACK_TOOL_OPTIONS: readonly OfflineCoursePackToolOption[] = [
  {
    key: "course-home",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "agenda",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "announcements",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "course-description",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "documents",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "links",
    compatibility: "metadata_only",
    selectedByDefault: true,
  },
  {
    key: "course-progress",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "learning-paths",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "exercises",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "forums",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "assignments",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "surveys",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
  {
    key: "gradebook",
    compatibility: "read_only_offline",
    selectedByDefault: true,
  },
  {
    key: "notebook",
    compatibility: "available_offline",
    selectedByDefault: true,
  },
]
