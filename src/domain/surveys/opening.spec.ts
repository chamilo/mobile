import { describe, expect, it } from "vitest"

import { getSurveyOpenCapabilities } from "@/domain/surveys/opening"
import type { SurveySummary } from "@/domain/surveys/types"

function survey(overrides: Partial<SurveySummary> = {}): SurveySummary {
  return {
    id: 8,
    title: "Course feedback",
    subtitle: "",
    code: "FEEDBACK",
    language: "english",
    availableFrom: null,
    availableUntil: null,
    availabilityStatus: "open",
    anonymous: false,
    invitedCount: 0,
    answeredCount: 0,
    questionCount: 2,
    surveyType: 0,
    surveyTypeLabel: "Regular survey",
    mandatory: false,
    visible: true,
    canPreview: false,
    canAnswer: true,
    invitationAnswered: false,
    invitationLpItemId: 0,
    invitationCode: "invite-8",
    unsupportedReason: "",
    openMode: "answer",
    unavailableReason: null,
    ...overrides,
  }
}

describe("getSurveyOpenCapabilities", () => {
  it("keeps the learner invitation when the survey can be answered", () => {
    expect(getSurveyOpenCapabilities(survey())).toEqual({
      canAnswer: true,
      canPreview: false,
      answerInvitationCode: "invite-8",
    })
  })

  it("allows a course manager to answer an open survey through the verified auto invitation", () => {
    expect(
      getSurveyOpenCapabilities(
        survey({
          canAnswer: false,
          canPreview: true,
          invitationCode: "",
          openMode: "preview",
        }),
      ),
    ).toEqual({
      canAnswer: true,
      canPreview: true,
      answerInvitationCode: "auto",
    })
  })

  it("does not use learner visibility to block a course manager from answering", () => {
    expect(
      getSurveyOpenCapabilities(
        survey({
          canAnswer: false,
          canPreview: true,
          visible: false,
          invitationCode: "",
          openMode: "preview",
        }),
      ),
    ).toEqual({
      canAnswer: true,
      canPreview: true,
      answerInvitationCode: "auto",
    })
  })

  it("keeps preview available without offering manager answering for a closed survey", () => {
    expect(
      getSurveyOpenCapabilities(
        survey({
          canAnswer: false,
          canPreview: true,
          availabilityStatus: "closed",
          invitationCode: "",
          openMode: "preview",
        }),
      ),
    ).toEqual({
      canAnswer: false,
      canPreview: true,
      answerInvitationCode: "",
    })
  })

  it("does not expose answer or preview actions for unsupported survey workflows", () => {
    expect(
      getSurveyOpenCapabilities(
        survey({
          canAnswer: false,
          canPreview: true,
          unsupportedReason: "Unsupported personality survey",
          openMode: null,
          unavailableReason: "unsupported",
        }),
      ),
    ).toEqual({
      canAnswer: false,
      canPreview: false,
      answerInvitationCode: "",
    })

    expect(
      getSurveyOpenCapabilities(
        survey({
          surveyType: 3,
          canAnswer: false,
          canPreview: false,
          openMode: null,
          unavailableReason: "meeting",
        }),
      ),
    ).toEqual({
      canAnswer: false,
      canPreview: false,
      answerInvitationCode: "",
    })
  })
})
