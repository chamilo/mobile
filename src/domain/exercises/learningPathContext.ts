import type { ExerciseLearningPathContext } from "@/domain/exercises/types"

interface LearningPathContextInput {
  origin?: string | null
  learningPathId?: string | null
  learningPathItemId?: string | null
  learningPathItemViewId?: string | null
  learningPathTitle?: string | null
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

export function hasExerciseLearningPathRouteContext(input: LearningPathContextInput): boolean {
  return (
    input.origin != null ||
    input.learningPathId != null ||
    input.learningPathItemId != null ||
    input.learningPathItemViewId != null ||
    input.learningPathTitle != null
  )
}

export function parseExerciseLearningPathRouteContext(
  input: LearningPathContextInput,
): ExerciseLearningPathContext | null {
  if (!hasExerciseLearningPathRouteContext(input)) return null
  if (input.origin !== "learnpath") return null

  const learningPathId = positiveInteger(input.learningPathId)
  const learningPathItemId = positiveInteger(input.learningPathItemId)
  const learningPathItemViewId = nonNegativeInteger(input.learningPathItemViewId)

  if (!learningPathId || !learningPathItemId || learningPathItemViewId === null) return null

  return {
    origin: "learnpath",
    learningPathId,
    learningPathItemId,
    learningPathItemViewId,
    learningPathTitle: input.learningPathTitle?.trim() ?? "",
  }
}

export function buildExerciseLearningPathApiQuery(
  context: ExerciseLearningPathContext | null | undefined,
): Record<string, string | number> {
  if (!context) return {}

  return {
    origin: "learnpath",
    lp_init: 1,
    learnpath_id: context.learningPathId,
    learnpath_item_id: context.learningPathItemId,
    ...(context.learningPathItemViewId > 0
      ? { learnpath_item_view_id: context.learningPathItemViewId }
      : {}),
  }
}

export function buildExerciseLearningPathRouteQuery(
  context: ExerciseLearningPathContext | null | undefined,
): Record<string, string | number> {
  if (!context) return {}

  return {
    ...buildExerciseLearningPathApiQuery(context),
    ...(context.learningPathTitle ? { learningPathTitle: context.learningPathTitle } : {}),
  }
}

export function parseLearningPathQuizContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  learningPathTitle: string,
): { exerciseId: number; context: ExerciseLearningPathContext } | null {
  if (!contentUrl || expectedLearningPathId <= 0 || expectedLearningPathItemId <= 0) return null

  let url: URL
  try {
    url = new URL(contentUrl, "https://mobile.invalid")
  } catch {
    return null
  }

  if (url.origin !== "https://mobile.invalid") return null

  const match = url.pathname.match(/^\/resources\/exercise\/\d+\/(\d+)\/player$/)
  const exerciseId = positiveInteger(match?.[1] ?? null)
  const learningPathId = positiveInteger(url.searchParams.get("learnpath_id"))
  const learningPathItemId = positiveInteger(url.searchParams.get("learnpath_item_id"))
  const learningPathItemViewId = nonNegativeInteger(url.searchParams.get("learnpath_item_view_id"))

  if (
    url.searchParams.get("origin") !== "learnpath" ||
    !exerciseId ||
    learningPathId !== expectedLearningPathId ||
    learningPathItemId !== expectedLearningPathItemId ||
    learningPathItemViewId === null
  ) {
    return null
  }

  return {
    exerciseId,
    context: {
      origin: "learnpath",
      learningPathId,
      learningPathItemId,
      learningPathItemViewId,
      learningPathTitle: learningPathTitle.trim(),
    },
  }
}
