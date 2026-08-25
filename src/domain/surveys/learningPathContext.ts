export interface LearningPathSurveyLaunch {
  surveyId: number
  learningPathId: number
  learningPathItemId: number
  invitationCode: string
  learningPathTitle: string
}

function positiveInteger(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseLearningPathSurveyContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  learningPathTitle: string,
): LearningPathSurveyLaunch | null {
  if (!contentUrl || expectedLearningPathId <= 0 || expectedLearningPathItemId <= 0) return null

  let url: URL
  try {
    url = new URL(contentUrl, "https://mobile.invalid")
  } catch {
    return null
  }

  if (url.origin !== "https://mobile.invalid") return null

  const match = url.pathname.match(/^\/resources\/survey\/\d+\/(\d+)\/answer$/)
  const surveyId = positiveInteger(match?.[1] ?? null)
  const learningPathId = positiveInteger(url.searchParams.get("lp_id"))
  const itemId = positiveInteger(url.searchParams.get("item_id"))
  const learningPathItemId = positiveInteger(url.searchParams.get("lpItemId"))
  const invitationCode = url.searchParams.get("invitationCode")?.trim() ?? ""

  if (
    !surveyId ||
    learningPathId !== expectedLearningPathId ||
    itemId !== expectedLearningPathItemId ||
    learningPathItemId !== expectedLearningPathItemId ||
    invitationCode !== "auto"
  ) {
    return null
  }

  return {
    surveyId,
    learningPathId,
    learningPathItemId,
    invitationCode,
    learningPathTitle: learningPathTitle.trim(),
  }
}
