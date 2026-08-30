import type {
  LearningPathRuntime,
  LearningPathScormCommitPayload,
} from "@/domain/learningPaths/types"

export function shouldRefreshScormProgress(payload: LearningPathScormCommitPayload): boolean {
  if (payload.terminated) return true

  return payload.changedKeys.some((key) =>
    key === "cmi.suspend_data" ||
    key === "cmi.progress_measure" ||
    key === "cmi.completion_status" ||
    key === "cmi.success_status" ||
    key === "cmi.core.lesson_status" ||
    key.startsWith("cmi.score.") ||
    key.startsWith("cmi.core.score."),
  )
}

export function mergeScormRuntimeProgress(
  target: LearningPathRuntime,
  refreshed: LearningPathRuntime,
): boolean {
  if (
    refreshed.lpId !== target.lpId ||
    refreshed.currentItemId !== target.currentItemId
  ) {
    return false
  }

  target.progress = refreshed.progress
  target.completedItems = refreshed.completedItems
  target.totalItems = refreshed.totalItems
  target.totalTime = refreshed.totalTime
  target.currentItemAttempt = refreshed.currentItemAttempt
  target.minimumTimeReached = refreshed.minimumTimeReached
  target.canRestart = refreshed.canRestart
  target.previousItemId = refreshed.previousItemId
  target.nextItemId = refreshed.nextItemId

  const refreshedItems = new Map(refreshed.items.map((item) => [item.id, item]))
  for (const item of target.items) {
    const nextItem = refreshedItems.get(item.id)
    if (!nextItem) continue

    item.status = nextItem.status
    item.score = nextItem.score
    item.available = nextItem.available
  }

  return true
}
