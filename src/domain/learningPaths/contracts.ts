import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  LearningPathRuntime,
  LearningPathRuntimeItem,
  LearningPathScormRuntime,
} from "@/domain/learningPaths/types"

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

const SUPPORTED_ITEM_TYPES = new Set([
  "document",
  "video",
  "readout_text",
  "sco",
  "asset",
  "quiz",
  "survey",
  "student_publication",
  "assignments",
  "forum",
  "thread",
])
const SCORM_ITEM_TYPES = new Set(["sco", "asset"])
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

function archivePath(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  const path = value.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  if (!path || path.includes("\0") || /^[A-Za-z]:/.test(path)) {
    return ""
  }

  const segments: string[] = []
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") {
      continue
    }
    if (segment === "..") {
      return ""
    }
    segments.push(segment)
  }

  return segments.join("/")
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.trim() !== "")
      .map(([key, entry]) => [key, entry === null || entry === undefined ? "" : String(entry)]),
  )
}

function normalizeScorm(value: unknown): LearningPathScormRuntime {
  if (!isRecord(value)) {
    return {
      enabled: false,
      version: "",
      itemViewId: 0,
      lpViewId: 0,
      userId: 0,
      lpType: 0,
      itemType: "",
      forceCommit: false,
      debug: false,
      values: {},
      packageEntryPath: "",
      packageParameters: "",
      packageFingerprint: "",
      packageSize: 0,
    }
  }

  const version = text(value.version)
  const packageFingerprint = text(value.packageFingerprint).toLowerCase()

  return {
    enabled: boolean(value.enabled),
    version: version === "1.2" || version === "2004" ? version : "",
    itemViewId: Math.max(0, integer(value.itemViewId)),
    lpViewId: Math.max(0, integer(value.lpViewId)),
    userId: Math.max(0, integer(value.userId)),
    lpType: Math.max(0, integer(value.lpType)),
    itemType: text(value.itemType).toLowerCase(),
    forceCommit: boolean(value.forceCommit),
    debug: boolean(value.debug),
    values: stringRecord(value.values),
    packageEntryPath: archivePath(value.packageEntryPath),
    packageParameters: text(value.packageParameters),
    packageFingerprint: /^[a-f0-9]{64}$/.test(packageFingerprint) ? packageFingerprint : "",
    packageSize: Math.max(0, integer(value.packageSize)),
  }
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

export function buildLearningPathScormPackageRequest(
  context: CourseNavigationContext,
  learningPathId: number,
  itemId: number,
): LearningPathRuntimeRequest {
  return {
    path: `/api/learning_paths/${positiveInteger(learningPathId, "learning path id")}/runtime/scorm/package`,
    query: {
      ...contextQuery(context),
      itemId: positiveInteger(itemId, "learning path item id"),
    },
  }
}

export function buildLearningPathScormCommitRequest(
  context: CourseNavigationContext,
  learningPathId: number,
): LearningPathRuntimeRequest {
  return {
    path: `/api/learning_paths/${positiveInteger(learningPathId, "learning path id")}/runtime/scorm/commit`,
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
    scorm: normalizeScorm(value.scorm),
    items: value.items.map(normalizeItem),
  }
}

export function isScormLearningPathItem(item: LearningPathRuntimeItem | null | undefined): boolean {
  return Boolean(item && SCORM_ITEM_TYPES.has(item.itemType.toLowerCase()))
}

export function isQuizLearningPathItem(item: LearningPathRuntimeItem | null | undefined): boolean {
  return Boolean(item && item.itemType.toLowerCase() === "quiz")
}

export function isSurveyLearningPathItem(item: LearningPathRuntimeItem | null | undefined): boolean {
  return Boolean(item && item.itemType.toLowerCase() === "survey")
}

export function isAssignmentLearningPathItem(
  item: LearningPathRuntimeItem | null | undefined,
): boolean {
  if (!item) return false

  return ["student_publication", "assignments"].includes(item.itemType.toLowerCase())
}

export function isForumLearningPathItem(item: LearningPathRuntimeItem | null | undefined): boolean {
  return Boolean(item && item.itemType.toLowerCase() === "forum")
}

export function isThreadLearningPathItem(item: LearningPathRuntimeItem | null | undefined): boolean {
  return Boolean(item && item.itemType.toLowerCase() === "thread")
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
  if (!isSupportedLearningPathItem(item) || !runtime.runtimeSupported) {
    return false
  }

  return isScormLearningPathItem(item)
    ? Boolean(runtime.scorm.packageEntryPath && runtime.scorm.packageFingerprint)
    : Boolean(runtime.contentUrl)
}

export function isCompletedLearningPathStatus(status: string): boolean {
  return COMPLETED_STATUSES.has(status.trim().toLowerCase())
}
