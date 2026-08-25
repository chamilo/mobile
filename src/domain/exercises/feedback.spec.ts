import { describe, expect, it } from "vitest"

import {
  isImmediateExerciseFeedbackType,
  normalizeExerciseFeedbackAfterAction,
  withExerciseFeedbackFallbackAction,
} from "@/domain/exercises/feedback"
import type { ExerciseAnswerFeedback } from "@/domain/exercises/types"

const baseFeedback: ExerciseAnswerFeedback = {
  enabled: true,
  mode: "direct",
  questionId: 11,
  status: "correct",
  title: "Correct",
  score: 1,
  maxScore: 1,
  entries: [],
  afterAction: "none",
  targetQuestionId: 0,
  targetUrl: "",
  achievedLevel: "",
  categoryScore: null,
}

describe("exercise feedback", () => {
  it.each([1, 3, 4, "1", "3", "4"])("detects immediate feedback type %s", (value) => {
    expect(isImmediateExerciseFeedbackType(value)).toBe(true)
  })

  it.each([0, 2, null, undefined, ""])("keeps deferred feedback type %s outside the immediate runtime", (value) => {
    expect(isImmediateExerciseFeedbackType(value)).toBe(false)
  })

  it("uses the requested navigation action when the backend does not override it", () => {
    expect(withExerciseFeedbackFallbackAction(baseFeedback, "next").afterAction).toBe("next")
  })

  it("keeps adaptive backend navigation authoritative", () => {
    expect(
      withExerciseFeedbackFallbackAction(
        { ...baseFeedback, afterAction: "question", targetQuestionId: 44 },
        "next",
      ).afterAction,
    ).toBe("question")
  })

  it("normalizes unsupported actions to none", () => {
    expect(normalizeExerciseFeedbackAfterAction("javascript:alert(1)")).toBe("none")
  })
})
