import type {
  ExerciseMediaRuntime,
  ExercisePageBreakRuntime,
  ExerciseQuestion,
  ExerciseRuntimePage,
} from "@/domain/exercises/types"

export interface ExerciseStructuralContext {
  page: ExerciseRuntimePage | null
  media: ExerciseMediaRuntime | null
  pageBreak: ExercisePageBreakRuntime | null
}

export function findExerciseRuntimePage(
  pages: ExerciseRuntimePage[] | undefined,
  questionId: number,
): ExerciseRuntimePage | null {
  if (!Number.isInteger(questionId) || questionId <= 0) return null

  return pages?.find((page) => page.questionIds.includes(questionId)) ?? null
}

export function resolveExerciseStructuralContext(
  question: ExerciseQuestion,
  pages: ExerciseRuntimePage[] | undefined,
): ExerciseStructuralContext {
  const page = findExerciseRuntimePage(pages, question.id)

  return {
    page,
    media: page?.media ?? question.parent ?? null,
    pageBreak: page?.pageBreak ?? null,
  }
}
