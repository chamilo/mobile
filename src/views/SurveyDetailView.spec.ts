import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SurveyDetail } from "@/domain/surveys/types"
import { i18n } from "@/i18n"
import { useLocaleStore } from "@/stores/locale"
import { useSurveysStore } from "@/stores/surveys"
import SurveyDetailView from "@/views/SurveyDetailView.vue"

const props = {
  courseId: "16",
  surveyId: "8",
  surveyTitle: null,
  mode: "preview",
  invitationLpItemId: null,
  invitationCode: null,
  learningPathId: null,
  learningPathTitle: null,
  sessionId: null,
  membershipId: "70",
  sessionCourseId: null,
  source: "direct",
  embedded: true,
}

function translatedHtml(english: string, spanish: string): string {
  return [
    '<div class="tiny-content">',
    `<div lang="en_US" class="mce-translatehtml"><p>${english}</p></div>`,
    `<div class="mce-translatehtml" lang="es"><p>${spanish}</p></div>`,
    "</div>",
  ].join("")
}

function surveyDetail(overrides: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 8,
    title: "Course feedback",
    subtitle: "",
    code: "FEEDBACK",
    intro: "",
    thanks: "",
    anonymous: false,
    oneQuestionPerPage: false,
    displayQuestionNumber: true,
    availableFrom: null,
    availableUntil: null,
    surveyType: 0,
    invitationCode: "",
    csrfToken: "csrf-8",
    preview: true,
    canSubmit: false,
    isAnswered: false,
    isFinished: false,
    message: "",
    pages: [
      {
        number: 1,
        questions: [
          {
            id: 20,
            text: "How satisfied are you?",
            comment: "",
            type: "multiplechoice",
            typeLabel: "Multiple choice",
            required: true,
            supported: true,
            maxValue: null,
            parentQuestionId: null,
            parentOptionId: null,
            options: [
              { id: 30, label: "Satisfied", value: 1, isOther: false },
              { id: 31, label: "Not satisfied", value: 0, isOther: false },
            ],
          },
        ],
      },
    ],
    answers: {},
    profileFields: [],
    settings: {
      backwardsEnabled: true,
      allowAnsweredQuestionEdit: false,
    },
    ...overrides,
  }
}

async function mountSurvey(detail: SurveyDetail, locale = "en_US") {
  const pinia = createPinia()
  setActivePinia(pinia)

  const localeStore = useLocaleStore()
  localeStore.setUserLocale(locale)

  const store = useSurveysStore()
  Object.assign(store.detail, {
    status: "ready",
    data: detail,
    draft: {
      version: 1,
      surveyId: detail.id,
      answers: structuredClone(detail.answers),
      otherAnswers: {},
      profileValues: {},
      savedAt: "2026-09-18T00:00:00.000Z",
      finalizedAt: null,
    },
    submitStatus: "idle",
    errorCode: null,
    validationQuestionErrors: {},
    validationProfileErrors: {},
  })
  vi.spyOn(store, "loadSurvey").mockResolvedValue(true)

  const wrapper = mount(SurveyDetailView, {
    props,
    global: {
      plugins: [pinia, i18n],
    },
  })

  await flushPromises()
  return wrapper
}

describe("SurveyDetailView", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("shows every supported option in preview mode without allowing changes", async () => {
    const wrapper = await mountSurvey(surveyDetail())
    const options = wrapper.findAll('input[name="surveyAnswers[20]"]')

    expect(options).toHaveLength(2)
    expect(options.every((option) => (option.element as HTMLInputElement).disabled)).toBe(true)
    expect(wrapper.text()).toContain("Satisfied")
    expect(wrapper.text()).toContain("Not satisfied")
    expect(wrapper.text()).not.toContain("No answer recorded")
  })

  it("shows the recorded option selected in read-only mode", async () => {
    const wrapper = await mountSurvey(
      surveyDetail({
        isAnswered: true,
        answers: { "20": 31 },
      }),
    )

    const selected = wrapper.get('input[name="surveyAnswers[20]"][value="31"]')

    expect((selected.element as HTMLInputElement).checked).toBe(true)
    expect((selected.element as HTMLInputElement).disabled).toBe(true)
  })

  it("keeps options enabled while the learner can answer", async () => {
    const wrapper = await mountSurvey(
      surveyDetail({
        preview: false,
        canSubmit: true,
      }),
    )
    const options = wrapper.findAll('input[name="surveyAnswers[20]"]')

    expect(options).toHaveLength(2)
    expect(options.every((option) => !(option.element as HTMLInputElement).disabled)).toBe(true)
  })

  it("filters translated HTML in survey content, questions and alternatives before rendering", async () => {
    const wrapper = await mountSurvey(
      surveyDetail({
        title: translatedHtml("English survey", "Encuesta española"),
        subtitle: translatedHtml("English subtitle", "Subtítulo español"),
        intro: translatedHtml("English introduction", "Introducción española"),
        thanks: translatedHtml("English thanks", "Gracias en español"),
        pages: [
          {
            number: 1,
            questions: [
              {
                id: 20,
                text: translatedHtml("English question", "Pregunta española"),
                comment: translatedHtml("English comment", "Comentario español"),
                type: "multiplechoice",
                typeLabel: translatedHtml("Multiple choice", "Opción múltiple"),
                required: true,
                supported: true,
                maxValue: null,
                parentQuestionId: null,
                parentOptionId: null,
                options: [
                  {
                    id: 30,
                    label: translatedHtml("Satisfied", "Satisfecho"),
                    value: 1,
                    isOther: false,
                  },
                  {
                    id: 31,
                    label: translatedHtml("Not satisfied", "No satisfecho"),
                    value: 0,
                    isOther: false,
                  },
                ],
              },
            ],
          },
        ],
      }),
      "es",
    )

    const text = wrapper.text()

    expect(text).toContain("Encuesta española")
    expect(text).toContain("Subtítulo español")
    expect(text).toContain("Introducción española")
    expect(text).toContain("Pregunta española")
    expect(text).toContain("Comentario español")
    expect(text).toContain("Opción múltiple")
    expect(text).toContain("Satisfecho")
    expect(text).toContain("No satisfecho")
    expect(text).toContain("Gracias en español")

    expect(text).not.toContain("English survey")
    expect(text).not.toContain("English subtitle")
    expect(text).not.toContain("English introduction")
    expect(text).not.toContain("English question")
    expect(text).not.toContain("English comment")
    expect(text).not.toContain("Multiple choice")
    expect(text).not.toContain("Not satisfied")
    expect(text).not.toContain("English thanks")

    expect(wrapper.findAll('input[name="surveyAnswers[20]"]')).toHaveLength(2)
  })
})
