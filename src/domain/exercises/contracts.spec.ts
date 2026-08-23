import { describe, expect, it } from "vitest"

import {
  ExerciseContractError,
  normalizeExerciseList,
  normalizeExerciseRuntime,
} from "@/domain/exercises/contracts"

describe("exercise contracts", () => {
  it("normalizes the verified exercise list shape", () => {
    const result = normalizeExerciseList({
      items: [
        {
          iid: 7,
          title: "Safety quiz",
          description: "Introduction",
          availabilityStatus: "available",
          questionCount: 3,
          attemptCount: 1,
          canOpen: true,
        },
      ],
      totalItems: 1,
    })

    expect(result.items[0]).toMatchObject({
      id: 7,
      title: "Safety quiz",
      questionCount: 3,
      canOpen: true,
    })
  })

  it("normalizes runtime questions and the active attempt", () => {
    const result = normalizeExerciseRuntime({
      exerciseId: 7,
      title: "Safety quiz",
      settings: { confirmSavedAnswers: true },
      questions: [
        {
          id: 11,
          title: "Choose one",
          type: 1,
          typeLabel: "Unique answer",
          choices: [{ id: 21, answer: "A", position: 1 }],
        },
      ],
      canManage: true,
      canStartAttempt: false,
      legacyUrls: {
        overview: "/main/exercise/overview.php?exerciseId=7&cid=3",
      },
      attempt: {
        attemptId: 99,
        success: true,
        canFinish: true,
        savedAnswers: {
          11: [{ answer: "21", position: null }],
        },
        reviewQuestionIds: [11],
      },
    })

    expect(result.questions[0]?.choices[0]?.id).toBe(21)
    expect(result.attempt?.savedAnswers["11"]?.[0]?.answer).toBe("21")
    expect(result.canManage).toBe(true)
    expect(result.canStartAttempt).toBe(false)
    expect(result.legacyUrls.overview).toContain("/main/exercise/overview.php")
    expect(result.attempt?.reviewQuestionIds).toEqual([11])
  })

  it("preserves structural page, media parent, reading and special runtime contracts", () => {
    const result = normalizeExerciseRuntime({
      exerciseId: 12,
      title: "Reading with media",
      settings: {
        runtimePages: [
          {
            index: 0,
            number: 1,
            type: "media_group",
            media: {
              id: 80,
              title: "Read the chart",
              description: "Media instructions",
              type: 15,
              typeLabel: "Media question",
              content: {
                title: "Read the chart",
                description: "Media content",
              },
            },
            pageBreak: null,
            questionIds: [81],
          },
          {
            index: 1,
            number: 2,
            type: "questions",
            media: null,
            pageBreak: {
              id: 82,
              title: "Second section",
              description: "Continue here",
              content: {
                title: "Second section",
                description: "Section content",
              },
            },
            questionIds: [83],
          },
        ],
        usesStructuralPages: true,
        forceGroupedByMedia: true,
        effectiveOneQuestionPerPage: true,
      },
      questions: [
        {
          id: 81,
          title: "Reading question",
          description: "Reading text",
          type: 21,
          typeLabel: "Reading comprehension",
          choices: [{ id: 91, answer: "Answer", position: 1 }],
          parentId: 80,
          parent: {
            id: 80,
            title: "Read the chart",
            description: "Media instructions",
            type: 15,
            typeLabel: "Media question",
            content: {
              title: "Read the chart",
              description: "Media content",
            },
          },
          reading: {
            speed: 175,
            text: "Reading text",
          },
          content: null,
          annotation: { image: { url: "/resource/annotation.png" } },
          hotspot: { image: { url: "/resource/hotspot.png" } },
          onlyoffice: { editorUrl: "/plugin/onlyoffice/editor" },
          isContent: false,
        },
      ],
    })

    expect(result.runtimePages).toHaveLength(2)
    expect(result.runtimePages?.[0]?.media?.id).toBe(80)
    expect(result.runtimePages?.[1]?.pageBreak?.title).toBe("Second section")
    expect(result.usesStructuralPages).toBe(true)
    expect(result.forceGroupedByMedia).toBe(true)
    expect(result.effectiveOneQuestionPerPage).toBe(true)

    const question = result.questions[0]
    expect(question?.parentId).toBe(80)
    expect(question?.parent?.content?.description).toBe("Media content")
    expect(question?.reading).toEqual({ speed: 175, text: "Reading text" })
    expect(question?.annotation).toMatchObject({ image: { url: "/resource/annotation.png" } })
    expect(question?.hotspot).toMatchObject({ image: { url: "/resource/hotspot.png" } })
    expect(question?.onlyoffice).toMatchObject({ editorUrl: "/plugin/onlyoffice/editor" })
  })

  it("rejects a runtime without a valid exercise id", () => {
    expect(() => normalizeExerciseRuntime({ title: "Invalid" })).toThrow(ExerciseContractError)
  })
})
