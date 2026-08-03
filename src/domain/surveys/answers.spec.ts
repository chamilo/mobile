import { describe, expect, it } from "vitest"

import {
  buildSurveyDraftSnapshotKey,
  buildSurveySubmissionPayload,
  createSurveyDraft,
  isSurveyQuestionVisible,
  validateSurveyDraft,
} from "@/domain/surveys/answers"
import { normalizeSurveyDetail } from "@/domain/surveys/contracts"

const context = {
  courseId: 16,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

function detail() {
  return normalizeSurveyDetail({
    surveyId: 8,
    invitationCode: "invite-8",
    csrfToken: "csrf-8",
    preview: false,
    canSubmit: true,
    isAnswered: false,
    isFinished: false,
    survey: {
      iid: 8,
      title: "Course feedback",
      surveyType: 0,
    },
    questions: [
      {
        iid: 20,
        question: "Was the course useful?",
        type: "yesno",
        typeLabel: "Yes / No",
        isRequired: true,
        parentQuestionId: 0,
        parentOptionId: 0,
        options: [
          { iid: 30, label: "Yes", value: 1 },
          { iid: 31, label: "No", value: 0 },
        ],
      },
      {
        iid: 21,
        question: "Why?",
        type: "open",
        typeLabel: "Open",
        isRequired: false,
        parentQuestionId: 20,
        parentOptionId: 30,
        options: [],
      },
    ],
    pages: [[20, 21]],
    answers: {},
    profileFields: [
      {
        key: "profile_email",
        label: "E-mail",
        type: "text",
        inputType: "email",
        value: "student@example.org",
        required: true,
        readOnly: false,
        options: [],
      },
    ],
    settings: {
      backwardsEnabled: true,
      allowAnsweredQuestionEdit: false,
    },
  })
}

describe("survey answers", () => {
  it("validates visible required answers and profile fields", () => {
    const survey = detail()
    const draft = createSurveyDraft(survey)

    expect(validateSurveyDraft(survey, draft)).toMatchObject({
      valid: false,
      questionErrors: { "20": "required" },
    })

    draft.answers["20"] = 30
    expect(validateSurveyDraft(survey, draft).valid).toBe(true)
    expect(isSurveyQuestionVisible(survey.pages[0]!.questions[1]!, draft.answers)).toBe(true)

    draft.answers["20"] = 31
    expect(isSurveyQuestionVisible(survey.pages[0]!.questions[1]!, draft.answers)).toBe(false)
  })

  it("builds the exact backend payload and excludes hidden answers", () => {
    const survey = detail()
    const draft = createSurveyDraft(survey)
    draft.answers = {
      "20": 31,
      "21": "This hidden answer must not be submitted",
    }

    expect(buildSurveySubmissionPayload(survey, draft)).toEqual({
      csrfToken: "csrf-8",
      answers: { "20": 31 },
      otherAnswers: {},
      profileValues: { profile_email: "student@example.org" },
    })
  })

  it("namespaces drafts by course, session, survey and learning-path item", () => {
    expect(buildSurveyDraftSnapshotKey(context, 8, 27)).toBe("survey-draft:16:4:8:27")
  })
})
