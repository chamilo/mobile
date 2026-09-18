// @vitest-environment jsdom

import { mount } from "@vue/test-utils"
import { createPinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import ExerciseRuntimeQuestionCard from "@/components/exercises/ExerciseRuntimeQuestionCard.vue"
import type { ExerciseAnswerState, ExerciseQuestion } from "@/domain/exercises/types"
import { i18n } from "@/i18n"

function answerState(dropdown: number[] = []): ExerciseAnswerState {
  return {
    choice: null,
    choices: [],
    trueFalse: {},
    degreeCertainty: {},
    blanks: {},
    matching: {},
    order: [],
    dropdown,
    calculated: "",
    calculatedAnswerId: null,
    text: "",
    annotationPaths: [],
    annotationTexts: [],
    hotspotPoints: [],
    uploadedFiles: [],
    reviewLater: false,
  }
}

function readingQuestion(): ExerciseQuestion {
  return {
    id: 21,
    title: "What is the main idea?",
    description: "",
    type: 21,
    typeLabel: "Reading comprehension",
    position: 1,
    mandatory: true,
    duration: null,
    choices: [
      { id: 101, answer: "First answer", position: 1 },
      { id: 102, answer: "Second answer", position: 2 },
    ],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: null,
    calculated: null,
    reading: {
      speed: 50,
      text: "<p>One two three four</p>",
    },
    onlyoffice: null,
    annotation: null,
    hotspot: null,
    isContent: false,
  }
}

function dropdownQuestion(type: 28 | 29): ExerciseQuestion {
  return {
    id: type,
    title: "Choose every valid answer",
    description: "",
    type,
    typeLabel:
      type === 28 ? "Multiple answer dropdown combination" : "Multiple answer dropdown",
    position: 1,
    mandatory: true,
    duration: null,
    choices: [],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: {
      options: [
        { id: 201, answer: "Alpha", position: 1 },
        { id: 202, answer: "Beta", position: 2 },
        { id: 203, answer: "Gamma", position: 3 },
      ],
    },
    calculated: null,
    reading: null,
    onlyoffice: null,
    annotation: null,
    hotspot: null,
    isContent: false,
  }
}

function mountCard(question: ExerciseQuestion, answer = answerState()) {
  return mount(ExerciseRuntimeQuestionCard, {
    props: {
      question,
      answer,
      showTitle: true,
      readingAutoStart: false,
      readingPreviouslyCompleted: false,
    },
    global: {
      plugins: [createPinia(), i18n],
    },
  })
}

describe("ExerciseRuntimeQuestionCard", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("follows the web reading-comprehension flow before revealing the question", async () => {
    const wrapper = mountCard(readingQuestion())

    expect(wrapper.find("h2").exists()).toBe(false)
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    expect(wrapper.text()).toContain("50 words per minute")

    const startButton = wrapper.get("button")
    expect(startButton.text()).toContain("Start")
    await startButton.trigger("click")

    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)

    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.find("h2").text()).toBe("What is the main idea?")
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.emitted("readingState")?.at(-1)?.[0]).toEqual({
      questionId: 21,
      started: true,
      complete: true,
    })
  })

  it("reveals choices after the final timed block for a longer reading passage", async () => {
    const question = readingQuestion()
    question.reading = {
      speed: 50,
      text: "<p>One two three four five six seven eight nine ten</p>",
    }
    const wrapper = mountCard(question)

    await wrapper.get("button").trigger("click")

    vi.advanceTimersByTime(9000)
    await nextTick()
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)

    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.emitted("readingState")?.at(-1)?.[0]).toEqual({
      questionId: 21,
      started: true,
      complete: true,
    })
  })

  it("keeps the reading result visible when the parent persists completion", async () => {
    const question = readingQuestion()
    question.reading = {
      speed: 50,
      text: "<p>One two three four five six seven eight nine ten</p>",
    }
    const wrapper = mountCard(question)

    await wrapper.get("button").trigger("click")
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)

    await wrapper.setProps({ readingPreviouslyCompleted: true })
    await nextTick()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.find("h2").text()).toBe("What is the main idea?")
  })

  it("reveals a previously saved reading-comprehension question without replaying it", () => {
    const wrapper = mount(ExerciseRuntimeQuestionCard, {
      props: {
        question: readingQuestion(),
        answer: { ...answerState(), choice: 101 },
        showTitle: true,
        readingAutoStart: false,
        readingPreviouslyCompleted: true,
      },
      global: {
        plugins: [createPinia(), i18n],
      },
    })

    expect(wrapper.find("h2").text()).toBe("What is the main idea?")
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("auto-starts reading comprehension in one-question-per-page mode", async () => {
    const wrapper = mount(ExerciseRuntimeQuestionCard, {
      props: {
        question: readingQuestion(),
        answer: answerState(),
        showTitle: true,
        readingAutoStart: true,
        readingPreviouslyCompleted: false,
      },
      global: {
        plugins: [createPinia(), i18n],
      },
    })

    expect(wrapper.find("button").exists()).toBe(false)
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)

    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
  })

  it.each([28, 29] as const)(
    "keeps multiple dropdown selections for question type %s",
    async (type) => {
      const wrapper = mountCard(dropdownQuestion(type), answerState([201]))
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(wrapper.find("details").exists()).toBe(true)
      expect(checkboxes).toHaveLength(3)
      expect((checkboxes[0]?.element as HTMLInputElement).checked).toBe(true)

      await checkboxes[1]?.setValue(true)

      expect(wrapper.emitted("updateAnswer")?.at(-1)?.[0]).toMatchObject({
        dropdown: [201, 202],
      })
    },
  )
})
