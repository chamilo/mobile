import { describe, expect, it } from "vitest"

import {
  exerciseRuntimeCompatibilityReason,
  isExercisePreviousNavigationAllowed,
  isExerciseQuestionTitleVisible,
} from "@/domain/exercises/runtimeCompatibility"

describe("exercise runtime compatibility", () => {
  it("keeps the basic deferred-feedback runtime native", () => {
    expect(exerciseRuntimeCompatibilityReason({ feedbackType: 0 })).toBeNull()
    expect(exerciseRuntimeCompatibilityReason({ feedbackType: 2 })).toBeNull()
  })

  it.each([1, 3, 4])("keeps verified immediate feedback type %s native", (feedbackType: number) => {
    expect(exerciseRuntimeCompatibilityReason({ feedbackType })).toBeNull()
  })

  it("falls back when per-question timing is active", () => {
    expect(
      exerciseRuntimeCompatibilityReason({
        allowTimePerQuestion: true,
        hasTimedQuestions: true,
      }),
    ).toBe("timed_questions")
  })

  it("falls back for runtime semantics not implemented natively yet", () => {
    expect(exerciseRuntimeCompatibilityReason({ blockCategoryQuestions: true })).toBe(
      "blocked_categories",
    )
    expect(exerciseRuntimeCompatibilityReason({ usesStructuralPages: true }, [])).toBe(
      "structural_pages",
    )
    expect(
      exerciseRuntimeCompatibilityReason(
        { usesStructuralPages: true },
        [
          {
            index: 0,
            number: 1,
            type: "questions",
            questionIds: [1],
            media: null,
            pageBreak: null,
          },
        ],
      ),
    ).toBeNull()
    expect(
      exerciseRuntimeCompatibilityReason(
        { usesStructuralPages: true },
        [
          {
            index: 0,
            number: 1,
            type: "media_group",
            questionIds: [1],
            media: {
              id: 15,
              title: "Reference",
              description: '<img src="https://campus.example.org/r/resource/15/view">',
            },
            pageBreak: null,
          },
        ],
        "https://campus.example.org",
      ),
    ).toBe("structural_pages")
  })

  it("falls back when a final review would conflict with prevent-backwards", () => {
    expect(
      exerciseRuntimeCompatibilityReason({
        preventBackwards: true,
        reviewAnswers: 1,
      }),
    ).toBe("prevent_backwards_review")
    expect(
      exerciseRuntimeCompatibilityReason({
        preventBackwards: true,
        checkAllAnswersBeforeEndTest: true,
      }),
    ).toBe("prevent_backwards_review")
    expect(exerciseRuntimeCompatibilityReason({ preventBackwards: true })).toBeNull()
  })

  it("honors previous-navigation and question-title settings", () => {
    expect(isExercisePreviousNavigationAllowed({})).toBe(true)
    expect(isExercisePreviousNavigationAllowed({ preventBackwards: true })).toBe(false)
    expect(isExercisePreviousNavigationAllowed({ showPreviousButton: false })).toBe(false)
    expect(isExercisePreviousNavigationAllowed({ blockCategoryQuestions: true })).toBe(false)

    expect(isExerciseQuestionTitleVisible({})).toBe(true)
    expect(isExerciseQuestionTitleVisible({ hideQuestionTitle: true })).toBe(false)
  })
})
