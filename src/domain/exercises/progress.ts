import type { ExerciseAnswerResponse, ExerciseAttempt } from "@/domain/exercises/types"

export interface ExerciseAnswerProgress {
  savedQuestionIds: number[]
  reviewQuestionIds: number[]
  canFinish: boolean
}

export function mergeExerciseAnswerProgress(
  attempt: ExerciseAttempt,
  response: ExerciseAnswerResponse,
): ExerciseAnswerProgress {
  return {
    savedQuestionIds: [...response.answeredQuestionIds],
    reviewQuestionIds: [...response.reviewQuestionIds],
    canFinish: attempt.canFinish,
  }
}
