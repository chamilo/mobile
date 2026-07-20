import type { CourseNavigationContext } from "@/domain/courses/types"
import type { LearningPathRuntime, LearningPathRuntimeItem } from "@/domain/learningPaths/types"

export class LearningPathContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LearningPathContractError"
  }
}

type UnknownRecord = Record<string, unknown>

export interface LearningPathRuntimeRequest {
  path: string
  query: Record<string, number>
}

const OPENABLE_ITEM_TYPES = new Set(["document", "video", "readout_text"])

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function integer(value: unknown, fallback = 0): number {
  const parsed = numeric(value)
  return parsed !== null && Number.isInteger(parsed) ? parsed : fallback
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = integer(value)

  if (parsed <= 0) {
    throw new LearningPathContractError(`Invalid ${field}.`)
  }

  return parsed
}

function boolean(value: unknown): boolean {
  return value === true
}

function plainText(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function relativePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const path = value.trim()

  if (!path || /^https?:\/\//i.test(path) || path.startsWith("//")) {
    return null
  }

  return path.startsWith("/") ? path : `/${path}`
}

function normalizeItem(value: unknown): LearningPathRuntimeItem {
  if (!isRecord(value)) {
    throw new LearningPathContractError("A learning path item is invalid.")
  }

  return {
    id: positiveInteger(value.id, "learning path item id"),
    title: plainText(value.title) || "Learning path item",
    itemType: typeof value.itemType === "string" ? value.itemType.trim().toLowerCase() : "",
    parentId: Math.max(0, integer(value.parentId)),
    level: Math.max(0, integer(value.level)),
    displayOrder: integer(value.displayOrder),
    status:
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim()
        : "not attempted",
    score: numeric(value.score) ?? 0,
    available: boolean(value.available),
    isSection: boolean(value.isSection),
    hasChildren: boolean(value.hasChildren),
    hasPrerequisite: boolean(value.hasPrerequisite),
  }
}

export function buildLearningPathRuntimeRequest(
  context: CourseNavigationContext,
  learningPathId: number,
  itemId?: number,
): LearningPathRuntimeRequest {
  return {
    path: `/api/learning_paths/${positiveInteger(learningPathId, "learning path id")}/runtime`,
    query: {
      cid: context.courseId,
      ...(context.sessionId ? { sid: context.sessionId } : {}),
      ...(itemId && itemId > 0 ? { itemId } : {}),
    },
  }
}

export function normalizeLearningPathRuntime(value: unknown): LearningPathRuntime {
  if (!isRecord(value)) {
    throw new LearningPathContractError("The learning path runtime is invalid.")
  }

  if (!Array.isArray(value.items)) {
    throw new LearningPathContractError("The learning path runtime has no item collection.")
  }

  return {
    lpId: positiveInteger(value.lpId, "learning path id"),
    title: plainText(value.title) || "Learning path",
    lpType: integer(value.lpType, 1),
    runtimeSupported: boolean(value.runtimeSupported),
    progress: Math.max(0, Math.min(100, integer(value.progress))),
    completedItems: Math.max(0, integer(value.completedItems)),
    totalItems: Math.max(0, integer(value.totalItems)),
    totalTime: Math.max(0, integer(value.totalTime)),
    currentItemId: Math.max(0, integer(value.currentItemId)),
    previousItemId: Math.max(0, integer(value.previousItemId)),
    nextItemId: Math.max(0, integer(value.nextItemId)),
    contentUrl: relativePath(value.contentUrl),
    items: value.items.map(normalizeItem),
  }
}

export function isOpenableLearningPathItem(
  item: LearningPathRuntimeItem | null,
  runtime: LearningPathRuntime,
): boolean {
  return Boolean(
    item &&
    item.available &&
    !item.isSection &&
    runtime.runtimeSupported &&
    runtime.contentUrl &&
    OPENABLE_ITEM_TYPES.has(item.itemType),
  )
}
