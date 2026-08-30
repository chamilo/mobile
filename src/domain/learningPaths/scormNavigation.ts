import { isSupportedLearningPathItem } from "@/domain/learningPaths/contracts"
import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"

export type ScormTargetedNavigationAction = "choice" | "jump"

export interface ScormTargetedNavigationRequest {
  action: ScormTargetedNavigationAction
  targetRef: string
}

const TARGETED_NAVIGATION_REQUEST = /^\{target=([^}]+)\}(choice|jump)$/

export function parseScormTargetedNavigationRequest(
  request: string,
): ScormTargetedNavigationRequest | null {
  const match = request.trim().match(TARGETED_NAVIGATION_REQUEST)
  const targetRef = match?.[1]?.trim() ?? ""
  const action = match?.[2]

  if (!targetRef || (action !== "choice" && action !== "jump")) {
    return null
  }

  return { action, targetRef }
}

export function resolveScormTargetedNavigationItem(
  items: LearningPathRuntimeItem[],
  request: string,
): LearningPathRuntimeItem | null {
  const targetedRequest = parseScormTargetedNavigationRequest(request)
  if (!targetedRequest) {
    return null
  }

  const matches = items.filter(
    (item) => item.ref === targetedRequest.targetRef && isSupportedLearningPathItem(item),
  )

  return matches.length === 1 ? (matches[0] ?? null) : null
}
