import { translatedPlainText } from "@/domain/content/translatedHtml"
import type { ExerciseChoice, ExerciseQuestion } from "@/domain/exercises/types"

function localizeChoice(
  choice: ExerciseChoice,
  locale: string,
  fallbackLocales: string[],
): ExerciseChoice {
  return {
    ...choice,
    answer: translatedPlainText(choice.answer, locale, fallbackLocales),
  }
}

export function localizeExerciseQuestionContent(
  question: ExerciseQuestion,
  locale: string,
  fallbackLocales: string[] = [],
): ExerciseQuestion {
  return {
    ...question,
    title: translatedPlainText(question.title, locale, fallbackLocales),
    description: translatedPlainText(question.description, locale, fallbackLocales),
    choices: question.choices.map((choice) => localizeChoice(choice, locale, fallbackLocales)),
    trueFalseOptions: question.trueFalseOptions.map((option) => ({
      ...option,
      title: translatedPlainText(option.title, locale, fallbackLocales),
    })),
    fillBlanks: question.fillBlanks
      ? {
          ...question.fillBlanks,
          segments: question.fillBlanks.segments.map((segment) => ({
            ...segment,
            ...(segment.text !== undefined
              ? { text: translatedPlainText(segment.text, locale, fallbackLocales) }
              : {}),
          })),
        }
      : null,
    matching: question.matching
      ? {
          prompts: question.matching.prompts.map((choice) =>
            localizeChoice(choice, locale, fallbackLocales),
          ),
          options: question.matching.options.map((choice) => ({
            ...localizeChoice(choice, locale, fallbackLocales),
            ...(choice.label
              ? { label: translatedPlainText(choice.label, locale, fallbackLocales) }
              : {}),
          })),
        }
      : null,
    draggable: question.draggable
      ? {
          items: question.draggable.items.map((choice) =>
            localizeChoice(choice, locale, fallbackLocales),
          ),
        }
      : null,
    dropdown: question.dropdown
      ? {
          options: question.dropdown.options.map((choice) =>
            localizeChoice(choice, locale, fallbackLocales),
          ),
        }
      : null,
    calculated: question.calculated
      ? {
          ...question.calculated,
          text: translatedPlainText(question.calculated.text, locale, fallbackLocales),
          variations: question.calculated.variations.map((variation) => ({
            ...variation,
            text: translatedPlainText(variation.text, locale, fallbackLocales),
          })),
        }
      : null,
    reading: question.reading
      ? {
          ...question.reading,
          text: translatedPlainText(question.reading.text, locale, fallbackLocales),
        }
      : null,
  }
}
