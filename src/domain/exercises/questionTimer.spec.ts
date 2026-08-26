import { describe, expect, it } from "vitest"

import {
  createExerciseQuestionTimerAnchor,
  exerciseQuestionTimerRemainingSeconds,
  exerciseQuestionTimerSpentSeconds,
  isClientTimedExerciseQuestion,
} from "@/domain/exercises/questionTimer"

describe("exercise question timer", () => {
  it("continues from the saved seconds exposed by the existing runtime contract", () => {
    const anchor = createExerciseQuestionTimerAnchor(41, 30, 10, 1_000)

    expect(exerciseQuestionTimerSpentSeconds(anchor, 1_000)).toBe(10)
    expect(exerciseQuestionTimerRemainingSeconds(anchor, 1_000)).toBe(20)
    expect(exerciseQuestionTimerSpentSeconds(anchor, 6_999)).toBe(15)
    expect(exerciseQuestionTimerRemainingSeconds(anchor, 6_999)).toBe(15)
  })

  it("catches up after background time instead of trusting interval ticks", () => {
    const anchor = createExerciseQuestionTimerAnchor(41, 20, 0, 1_000)

    expect(exerciseQuestionTimerRemainingSeconds(anchor, 31_000)).toBe(0)
    expect(exerciseQuestionTimerSpentSeconds(anchor, 31_000)).toBe(20)
  })

  it("enables timing only from the existing per-question timing contract", () => {
    expect(isClientTimedExerciseQuestion({ allowTimePerQuestion: true }, 30)).toBe(true)
    expect(isClientTimedExerciseQuestion({ allowTimePerQuestion: false }, 30)).toBe(false)
    expect(isClientTimedExerciseQuestion({ allowTimePerQuestion: true }, null)).toBe(false)
  })
})
