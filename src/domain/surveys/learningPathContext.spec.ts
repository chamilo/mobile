import { describe, expect, it } from "vitest"

import { parseLearningPathSurveyContentUrl } from "@/domain/surveys/learningPathContext"

describe("survey learning path context", () => {
  it("parses the verified learning path survey URL", () => {
    expect(
      parseLearningPathSurveyContentUrl(
        "/resources/survey/41/9/answer?cid=14&lp_id=7&item_id=12&lpItemId=12&invitationCode=auto&returnToLp=1&embedded=1",
        7,
        12,
        "First lesson",
      ),
    ).toEqual({
      surveyId: 9,
      learningPathId: 7,
      learningPathItemId: 12,
      invitationCode: "auto",
      learningPathTitle: "First lesson",
    })
  })

  it("rejects a mismatched learning path survey item", () => {
    expect(
      parseLearningPathSurveyContentUrl(
        "/resources/survey/41/9/answer?lp_id=7&item_id=12&lpItemId=13&invitationCode=auto",
        7,
        12,
        "First lesson",
      ),
    ).toBeNull()
  })

  it("rejects a mismatched generic learning path item id", () => {
    expect(
      parseLearningPathSurveyContentUrl(
        "/resources/survey/41/9/answer?lp_id=7&item_id=13&lpItemId=12&invitationCode=auto",
        7,
        12,
        "First lesson",
      ),
    ).toBeNull()
  })

  it("rejects survey URLs without the verified automatic invitation context", () => {
    expect(
      parseLearningPathSurveyContentUrl(
        "/resources/survey/41/9/answer?lp_id=7&item_id=12&lpItemId=12",
        7,
        12,
        "First lesson",
      ),
    ).toBeNull()
  })
})
