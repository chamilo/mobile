// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { localizeExerciseQuestionContent } from "@/domain/exercises/presentation"
import type { ExerciseQuestion } from "@/domain/exercises/types"

function questionFixture(): ExerciseQuestion {
  return {
    id: 1,
    title:
      '<span class="mce-translatehtml" lang="en">Question</span><span class="mce-translatehtml" lang="es">Pregunta</span>',
    description: "",
    type: 21,
    typeLabel: "Reading comprehension",
    position: 1,
    mandatory: true,
    duration: null,
    choices: [
      {
        id: 10,
        answer:
          '<span class="mce-translatehtml" lang="en">Yes</span><span class="mce-translatehtml" lang="es">Sí</span>',
        position: 1,
      },
    ],
    trueFalseOptions: [],
    fillBlanks: null,
    matching: null,
    draggable: null,
    dropdown: null,
    calculated: null,
    reading: {
      speed: 175,
      text:
        '<span class="mce-translatehtml" lang="en">Reading text</span><span class="mce-translatehtml" lang="es">Texto de lectura</span>',
    },
    hotspot: null,
    isContent: false,
  }
}

describe("exercise presentation", () => {
  it("localizes the question and answer choices without changing their ids", () => {
    const localized = localizeExerciseQuestionContent(questionFixture(), "es")

    expect(localized.title).toBe("Pregunta")
    expect(localized.choices).toEqual([{ id: 10, answer: "Sí", position: 1 }])
    expect(localized.reading?.text).toBe("Texto de lectura")
  })
})
