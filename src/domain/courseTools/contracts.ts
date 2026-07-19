import type { CurrentUserProfile } from "@/domain/auth/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  AcceleratedCourseToolKey,
  CourseToolCard,
  CourseToolCollection,
} from "@/domain/courseTools/types"

export class CourseToolContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CourseToolContractError"
  }
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function booleanLabel(value: unknown, yes: string, no: string): string | null {
  return typeof value === "boolean" ? (value ? yes : no) : null
}

function formatDateTime(value: unknown): string {
  const raw = text(value)
  if (!raw) return ""

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function idFrom(value: unknown, fallback: number): string {
  if (typeof value === "number" || typeof value === "string") {
    const normalized = String(value).trim()
    if (normalized) return normalized
  }

  return String(fallback)
}

function hydraItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  if (!isRecord(value)) {
    throw new CourseToolContractError("The campus response is not a collection.")
  }

  if (Array.isArray(value["hydra:member"])) return value["hydra:member"]
  if (Array.isArray(value.member)) return value.member

  throw new CourseToolContractError("The campus response has no collection members.")
}

function normalizeLearningPath(item: unknown, index: number): CourseToolCard {
  if (!isRecord(item)) {
    throw new CourseToolContractError("A learning path is invalid.")
  }

  const progress = number(item.progress)
  const dates = [text(item.publishedOn), text(item.expiredOn)].filter(Boolean)

  return {
    id: idFrom(item.iid ?? item["@id"], index + 1),
    title: text(item.title) || `Learning path ${index + 1}`,
    description: text(item.description),
    metadata: [text(item.lpType) ? `Type: ${text(item.lpType)}` : "", ...dates].filter(Boolean),
    progress: progress === null ? null : Math.max(0, Math.min(100, progress)),
    score: null,
    status:
      booleanLabel(item.visible, "Visible", "Hidden") ??
      booleanLabel(item.preventReinit, "Restart disabled", "Restart allowed"),
  }
}

function normalizeExerciseAttempt(item: unknown, index: number): CourseToolCard {
  if (!isRecord(item)) {
    throw new CourseToolContractError("An exercise attempt is invalid.")
  }

  const quiz = isRecord(item.quiz) ? item.quiz : {}
  const score = number(item.score)
  const maxScore = number(item.maxScore)
  const scoreLabel =
    score !== null && maxScore !== null
      ? `${score} / ${maxScore}`
      : score !== null
        ? String(score)
        : null

  const quizId = number(quiz.iid)
  const questionAttemptCount = Array.isArray(item.attempts) ? item.attempts.length : null
  const learningPathId = number(item.origLpId)
  const startedAt = formatDateTime(item.startDate)
  const finishedAt = formatDateTime(item.exeDate)
  const duration = number(item.exeDuration)

  return {
    id: idFrom(item.exeId ?? item["@id"], index + 1),
    title:
      text(quiz.title) ||
      (quizId !== null ? `Exercise #${quizId}` : `Exercise attempt ${index + 1}`),
    description: "",
    metadata: [
      startedAt ? `Started: ${startedAt}` : "",
      finishedAt ? `Finished: ${finishedAt}` : "",
      duration !== null ? `Duration: ${duration} s` : "",
      questionAttemptCount !== null ? `Question records: ${questionAttemptCount}` : "",
      item.revised === true ? "Revised" : "",
      learningPathId !== null && learningPathId > 0 ? "Learning path attempt" : "",
    ].filter(Boolean),
    progress: null,
    score: scoreLabel,
    status: text(item.status) || null,
  }
}

export function normalizeCourseToolResponse(
  tool: AcceleratedCourseToolKey,
  value: unknown,
): CourseToolCollection {
  const source = hydraItems(value)
  const normalizer = tool === "learning-paths" ? normalizeLearningPath : normalizeExerciseAttempt
  const items = source.map(normalizer)

  return {
    items,
    totalItems: items.length,
    warningKey: tool === "exercises" ? "acceleratedTools.exercises.attemptHistoryNotice" : null,
  }
}

export interface ToolRequestContext {
  course: CourseNavigationContext
  user: CurrentUserProfile
  courseResourceNodeId: number | null
}

export interface ToolRequestDefinition {
  path: string
  query: Record<string, string | number | boolean>
}

export function buildCourseToolRequest(
  tool: AcceleratedCourseToolKey,
  context: ToolRequestContext,
): ToolRequestDefinition {
  const { course, user, courseResourceNodeId } = context

  if (tool === "learning-paths" && !courseResourceNodeId) {
    throw new CourseToolContractError("The course resource node is required for this tool.")
  }

  if (tool === "learning-paths") {
    const query: Record<string, string | number | boolean> = {
      cid: course.courseId,
      "resourceNode.parent": courseResourceNodeId as number,
      itemsPerPage: 5000,
    }

    if (course.sessionId) {
      query.sid = course.sessionId
    }

    return {
      path: "/api/learning_paths",
      query,
    }
  }

  const query: Record<string, string | number | boolean> = {
    user: `/api/users/${user.id}`,
    course: `/api/courses/${course.courseId}`,
    itemsPerPage: 5000,
    "order[startDate]": "desc",
  }

  if (course.sessionId) {
    query.session = `/api/sessions/${course.sessionId}`
  }

  return {
    path: "/api/track_e_exercises",
    query,
  }
}
