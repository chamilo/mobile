export interface LearningPathAssignmentLaunch {
  assignmentId: number
  learningPathId: number
  learningPathItemId: number
  learningPathTitle: string
}

function positiveInteger(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function nonNegativeInteger(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return 0
  if (!/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export function parseLearningPathAssignmentContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  expectedCourseId: number,
  expectedSessionId: number | null,
  learningPathTitle: string,
): LearningPathAssignmentLaunch | null {
  if (
    !contentUrl ||
    expectedLearningPathId <= 0 ||
    expectedLearningPathItemId <= 0 ||
    expectedCourseId <= 0
  ) {
    return null
  }

  let url: URL
  try {
    url = new URL(contentUrl, "https://mobile.invalid")
  } catch {
    return null
  }

  if (url.origin !== "https://mobile.invalid") return null

  const match = url.pathname.match(/^\/resources\/assignment\/(\d+)\/submission\/(\d+)$/)
  const resourceNodeId = positiveInteger(match?.[1])
  const assignmentId = positiveInteger(match?.[2])
  const learningPathId = positiveInteger(url.searchParams.get("lp_id"))
  const learningPathItemId = positiveInteger(url.searchParams.get("item_id"))
  const courseId = positiveInteger(url.searchParams.get("cid"))
  const sessionId = nonNegativeInteger(url.searchParams.get("sid"))
  const groupId = nonNegativeInteger(url.searchParams.get("gid"))

  if (
    !resourceNodeId ||
    !assignmentId ||
    learningPathId !== expectedLearningPathId ||
    learningPathItemId !== expectedLearningPathItemId ||
    courseId !== expectedCourseId ||
    sessionId !== (expectedSessionId ?? 0) ||
    groupId !== 0 ||
    url.searchParams.get("origin") !== "learnpath" ||
    url.searchParams.get("returnToLp") !== "1" ||
    url.searchParams.get("embedded") !== "1" ||
    url.searchParams.get("type") !== "step"
  ) {
    return null
  }

  return {
    assignmentId,
    learningPathId,
    learningPathItemId,
    learningPathTitle: learningPathTitle.trim(),
  }
}
