import type { SurveySummary } from "@/domain/surveys/types"

export interface SurveyOpenCapabilities {
  canAnswer: boolean
  canPreview: boolean
  answerInvitationCode: string
}

export function getSurveyOpenCapabilities(survey: SurveySummary): SurveyOpenCapabilities {
  const supported = survey.surveyType !== 3 && !survey.unsupportedReason
  const canOpenExistingAnswer = supported && survey.openMode === "answer"
  const canAutoAnswerAsManager =
    supported && survey.canPreview && survey.availabilityStatus === "open"

  return {
    canAnswer: canOpenExistingAnswer || canAutoAnswerAsManager,
    canPreview: supported && survey.canPreview,
    answerInvitationCode: canOpenExistingAnswer
      ? survey.invitationCode
      : canAutoAnswerAsManager
        ? "auto"
        : "",
  }
}
