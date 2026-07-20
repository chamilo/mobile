import type { CourseRole, CourseNavigationContext } from "@/domain/courses/types"
import type { CourseToolKey } from "@/domain/courseHome/types"

export class CourseToolAvailabilityContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CourseToolAvailabilityContractError"
  }
}

type UnknownRecord = Record<string, unknown>

const TOOL_ALIASES: Readonly<Record<string, CourseToolKey>> = {
  agenda: "agenda",
  calendar_event: "agenda",
  announcement: "announcements",
  announcements: "announcements",
  course_description: "course-description",
  course_progress: "course-progress",
  document: "documents",
  documents: "documents",
  link: "links",
  links: "links",
  learnpath: "learning-paths",
  learning_path: "learning-paths",
  exercise: "exercises",
  exercises: "exercises",
  forum: "forums",
  forums: "forums",
  student_publication: "assignments",
  assignments: "assignments",
  work: "assignments",
  survey: "surveys",
  surveys: "surveys",
  gradebook: "gradebook",
  notebook: "notebook",
}

export interface CourseToolAvailabilityRequest {
  path: string
  query: Record<string, string | number>
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function collectionItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (!isRecord(value)) {
    throw new CourseToolAvailabilityContractError("The course tools response is not a collection.")
  }

  if (Array.isArray(value["hydra:member"])) {
    return value["hydra:member"]
  }

  if (Array.isArray(value.member)) {
    return value.member
  }

  throw new CourseToolAvailabilityContractError(
    "The course tools response has no collection members.",
  )
}

function normalizedToolName(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
    : ""
}

export function buildCourseToolAvailabilityRequest(
  context: CourseNavigationContext,
): CourseToolAvailabilityRequest {
  return {
    path: "/api/c_tools",
    query: {
      cid: context.courseId,
      itemsPerPage: 5000,
      "order[position]": "asc",
      ...(context.sessionId ? { sid: context.sessionId } : {}),
    },
  }
}

export function normalizeAvailableCourseTools(value: unknown, role: CourseRole): CourseToolKey[] {
  const tools = new Set<CourseToolKey>()

  for (const item of collectionItems(value)) {
    if (!isRecord(item)) {
      continue
    }

    if (role !== "teacher" && item.visibility === false) {
      continue
    }

    const tool = isRecord(item.tool) ? item.tool : null
    const key = TOOL_ALIASES[normalizedToolName(tool?.title)]

    if (key) {
      tools.add(key)
    }
  }

  return [...tools]
}
