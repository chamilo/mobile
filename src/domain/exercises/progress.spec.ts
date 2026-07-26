import { describe, expect, it } from "vitest"

import { mergeExerciseAnswerProgress } from "@/domain/exercises/progress"
import type { ExerciseAnswerResponse, ExerciseAttempt } from "@/domain/exercises/types"

describe("exercise answer progress", () => {
  it("preserves the attempt finish capability after saving a draft", () => {
    const attempt = {
      canFinish: true,
    } as ExerciseAttempt
    const response = {
      canFinish: false,
      answeredQuestionIds: [10, 20],
      reviewQuestionIds: [20],
    } as ExerciseAnswerResponse

    expect(mergeExerciseAnswerProgress(attempt, response)).toEqual({
      savedQuestionIds: [10, 20],
      reviewQuestionIds: [20],
      canFinish: true,
    })
  })
})
