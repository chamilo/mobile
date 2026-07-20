import type { CourseNavigationContext } from "@/domain/courses/types"
import type { LearningPathRuntime, LearningPathRuntimeItem } from "@/domain/learningPaths/types"

export class LearningPathContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LearningPathContractError"
  }
}

type UnknownRecord = Record<string, unknown>
type LearningPathRuntimeAction = "item" | "sync" | "restart"

export interface LearningPathRuntimeRequest {
  path: string
  query: Record<string, string | number>
}

const SUPPORTED_ITEM_TYPES = new Set(["document", "video", "readout_text"])
const COMPLETED_STATUSES = new Set(["completed", "passed", "succeeded", "browsed", "failed"])

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
  return value === true || value === 1 || value === "1"
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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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
    itemType: text(value.itemType).toLowerCase(),
    parentId: Math.max(0, integer(value.parentId)),
    level: Math.max(0, integer(value.level)),
    displayOrder: integer(value.displayOrder),
    status: text(value.status) || "not attempted",
    score: numeric(value.score) ?? 0,
    available: boolean(value.available),
    isSection: boolean(value.isSection),
    hasChildren: boolean(value.hasChildren),
    hasPrerequisite: boolean(value.hasPrerequisite),
  }
}

function contextQuery(context: CourseNavigationContext): Record<string, string | number> {
  return {
    cid: context.courseId,
    ...(context.sessionId ? { sid: context.sessionId } : {}),
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
      ...contextQuery(context),
      ...(itemId && itemId > 0 ? { itemId } : {}),
    },
  }
}

export function buildLearningPathRuntimeActionRequest(
  context: CourseNavigationContext,
  learningPathId: number,
  action: LearningPathRuntimeAction,
): LearningPathRuntimeRequest {
  return {
    path: `/api/learning_paths/${positiveInteger(learningPathId, "learning path id")}/runtime/${action}`,
    query: contextQuery(context),
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
    hideToc: boolean(value.hideToc),
    accordionToc: boolean(value.accordionToc),
    progress: Math.max(0, Math.min(100, integer(value.progress))),
    completedItems: Math.max(0, integer(value.completedItems)),
    totalItems: Math.max(0, integer(value.totalItems)),
    totalTime: Math.max(0, integer(value.totalTime)),
    attemptMode: text(value.attemptMode) || "single",
    currentAttempt: Math.max(0, integer(value.currentAttempt)),
    currentItemAttempt: Math.max(0, integer(value.currentItemAttempt)),
    maxAttempts: Math.max(0, integer(value.maxAttempts)),
    canRestart: boolean(value.canRestart),
    minimumTime: Math.max(0, integer(value.minimumTime)),
    minimumTimeReached: boolean(value.minimumTimeReached),
    currentItemId: Math.max(0, integer(value.currentItemId)),
    previousItemId: Math.max(0, integer(value.previousItemId)),
    nextItemId: Math.max(0, integer(value.nextItemId)),
    contentUrl: relativePath(value.contentUrl),
    audioUrl: relativePath(value.audioUrl),
    audioTitle: plainText(value.audioTitle),
    audioAutoplay: boolean(value.audioAutoplay),
    actionToken: text(value.csrfToken),
    items: value.items.map(normalizeItem),
  }
}

export function isSupportedLearningPathItem(
  item: LearningPathRuntimeItem | null | undefined,
): boolean {
  return Boolean(
    item &&
    item.available &&
    !item.isSection &&
    SUPPORTED_ITEM_TYPES.has(item.itemType.toLowerCase()),
  )
}

export function isOpenableLearningPathItem(
  item: LearningPathRuntimeItem | null,
  runtime: LearningPathRuntime,
): boolean {
  return Boolean(
    isSupportedLearningPathItem(item) && runtime.runtimeSupported && runtime.contentUrl,
  )
}

export function isCompletedLearningPathStatus(status: string): boolean {
  return COMPLETED_STATUSES.has(status.trim().toLowerCase())
}
