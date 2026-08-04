import { describe, expect, it } from "vitest"

import {
  buildSurveyDetailRequest,
  buildSurveySubmitRequest,
  buildSurveysRequest,
  formatRecordedAnswers,
  normalizeSurveyCollection,
  normalizeSurveyDetail,
} from "@/domain/surveys/contracts"

const directContext = {
  courseId: 16,
  sessionId: null,
  membershipId: 70,
  sessionCourseId: null,
  source: "direct" as const,
}

const sessionContext = {
  courseId: 16,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("survey contracts", () => {
  it("builds the verified survey requests", () => {
    expect(buildSurveysRequest(directContext)).toEqual({
      path: "/api/survey/list",
      query: {
        cid: 16,
      },
    })

    expect(buildSurveyDetailRequest(sessionContext, 8, "answer", 27)).toEqual({
      path: "/api/survey/answer/8",
      query: {
        cid: 16,
        sid: 4,
        lpItemId: 27,
      },
    })

    expect(buildSurveyDetailRequest(sessionContext, 8, "preview")).toEqual({
      path: "/api/survey/answer/8",
      query: {
        cid: 16,
        sid: 4,
        preview: true,
      },
    })

    expect(
      buildSurveySubmitRequest(sessionContext, 8, 27, "invite-8", {
        csrfToken: "csrf-8",
        answers: { "20": 30 },
        otherAnswers: {},
        profileValues: {},
      }),
    ).toEqual({
      path: "/api/survey/answer/8",
      query: {
        cid: 16,
        sid: 4,
        lpItemId: 27,
        invitationCode: "invite-8",
      },
      body: {
        csrfToken: "csrf-8",
        answers: { "20": 30 },
        otherAnswers: {},
        profileValues: {},
      },
    })
  })

  it("normalizes learner and teacher survey actions safely", () => {
    const result = normalizeSurveyCollection({
      items: [
        {
          iid: 8,
          title: '<div class="tiny-content"><p>Course feedback</p></div>',
          subtitle: "<p>Tell us what you think</p>",
          code: "FEEDBACK",
          language: "english",
          availabilityStatus: "open",
          anonymous: false,
          invited: 4,
          answered: 2,
          questionCount: null,
          surveyType: 0,
          surveyTypeLabel: "Regular survey",
          mandatory: true,
          visible: true,
          canPreview: false,
          canAnswer: true,
          invitationAnswered: false,
          invitationLpItemId: 27,
        },
        {
          iid: 9,
          title: "Teacher preview",
          anonymous: false,
          surveyType: 0,
          canPreview: true,
        },
        {
          iid: 10,
          title: "Anonymous",
          anonymous: true,
          surveyType: 0,
          canPreview: false,
        },
        {
          iid: 11,
          title: "Completed survey",
          anonymous: false,
          surveyType: 0,
          canPreview: false,
          canAnswer: false,
          invitationAnswered: true,
        },
      ],
      totalItems: 4,
      canManage: false,
    })

    expect(result.items[0]).toMatchObject({
      id: 8,
      title: "Course feedback",
      subtitle: "Tell us what you think",
      invitationLpItemId: 27,
      openMode: "answer",
      unavailableReason: null,
    })
    expect(result.items[1]).toMatchObject({
      openMode: "preview",
      unavailableReason: null,
    })
    expect(result.items[2]).toMatchObject({
      openMode: null,
      unavailableReason: "anonymous",
    })
    expect(result.items[3]).toMatchObject({
      openMode: "answer",
      unavailableReason: null,
      invitationAnswered: true,
    })
  })

  it("normalizes questions, pages and existing answers", () => {
    const detail = normalizeSurveyDetail({
      surveyId: 8,
      invitationCode: "invite-8",
      csrfToken: "csrf-8",
      preview: false,
      canSubmit: false,
      isAnswered: true,
      isFinished: false,
      message: "",
      survey: {
        iid: 8,
        title: '<div class="tiny-content"><p>Course feedback</p></div>',
        subtitle: "Student survey",
        intro: "<p>Please answer honestly.</p>",
        thanks: "<p>Thank you.</p>",
        anonymous: false,
        oneQuestionPerPage: false,
        displayQuestionNumber: true,
        availableFrom: "2026-07-01T00:00:00+00:00",
        availableUntil: "2026-07-31T23:59:00+00:00",
        surveyType: 0,
      },
      questions: [
        {
          iid: 20,
          question: "<p>Was the course useful?</p>",
          comment: "",
          type: "yesno",
          typeLabel: "Yes / No",
          isRequired: true,
          isSupported: true,
          maxValue: 0,
          parentQuestionId: 0,
          parentOptionId: 0,
          options: [
            {
              iid: 30,
              label: "Yes",
              value: 1,
              isOther: false,
            },
            {
              iid: 31,
              label: "No",
              value: 0,
              isOther: false,
            },
          ],
        },
        {
          iid: 21,
          question: "Comments",
          type: "open",
          typeLabel: "Open",
          isRequired: false,
          isSupported: true,
          maxValue: 0,
          parentQuestionId: 20,
          parentOptionId: 30,
          options: [],
        },
      ],
      pages: [[20, 21]],
      answers: {
        "20": 30,
        "21": "Very useful",
      },
      profileFields: [
        {
          key: "profile_language",
          label: "Language",
          type: "select",
          inputType: "text",
          value: "english",
          required: true,
          readOnly: false,
          options: [{ value: "english", label: "English" }],
          helpText: "",
        },
      ],
      settings: {
        backwardsEnabled: true,
        allowAnsweredQuestionEdit: false,
      },
    })

    expect(detail).toMatchObject({
      id: 8,
      title: "Course feedback",
      intro: "Please answer honestly.",
      isAnswered: true,
      invitationCode: "invite-8",
      csrfToken: "csrf-8",
    })
    expect(detail.pages[0]?.questions).toHaveLength(2)
    expect(detail.pages[0]?.questions[1]).toMatchObject({
      parentQuestionId: 20,
      parentOptionId: 30,
    })
    expect(detail.profileFields[0]).toMatchObject({
      key: "profile_language",
      type: "select",
      value: "english",
    })
    expect(formatRecordedAnswers(detail.pages[0]!.questions[0]!, detail.answers)).toEqual(["Yes"])
    expect(formatRecordedAnswers(detail.pages[0]!.questions[1]!, detail.answers)).toEqual([
      "Very useful",
    ])
  })
})
