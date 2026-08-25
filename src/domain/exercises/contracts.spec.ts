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
          type: 21,
          typeLabel: "Reading comprehension",
          choices: [{ id: 21, answer: "A", position: 1 }],
          reading: { speed: 175, text: "Read this passage." },
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

    expect(result.questions[0].choices[0].id).toBe(21)
    expect(result.questions[0].reading).toEqual({ speed: 175, text: "Read this passage." })
    expect(result.attempt?.savedAnswers["11"][0].answer).toBe("21")
    expect(result.canManage).toBe(true)
    expect(result.canStartAttempt).toBe(false)
    expect(result.legacyUrls.overview).toContain("/main/exercise/overview.php")
    expect(result.attempt?.reviewQuestionIds).toEqual([11])
  })

  it("normalizes the verified hotspot runtime without requiring teacher coordinates", () => {
    const result = normalizeExerciseRuntime({
      exerciseId: 9,
      title: "Hotspot quiz",
      settings: {},
      questions: [
        {
          id: 31,
          title: "Select the areas",
          type: 26,
          typeLabel: "Hotspot combination",
          hotspot: {
            imageName: "body.png",
            imageUrl: "/r/resource/31/view?cid=14&sid=0&gid=0",
            maxClicks: 2,
            combination: true,
            delineation: false,
            zones: [
              { id: 101, answer: "Area A", position: 1, hotspotType: "circle" },
              { id: 102, answer: "Area B", position: 2, hotspotType: "poly" },
            ],
          },
        },
      ],
      canManage: false,
      canStartAttempt: true,
      legacyUrls: {},
      attempt: null,
    })

    expect(result.questions[0].hotspot).toEqual({
      imageName: "body.png",
      imageUrl: "/r/resource/31/view?cid=14&sid=0&gid=0",
      maxClicks: 2,
      combination: true,
      delineation: false,
      zones: [
        {
          id: 101,
          answer: "Area A",
          position: 1,
          hotspotType: "circle",
          score: null,
          coordinates: null,
        },
        {
          id: 102,
          answer: "Area B",
          position: 2,
          hotspotType: "poly",
          score: null,
          coordinates: null,
        },
      ],
    })
  })

  it("rejects a runtime without a valid exercise id", () => {
    expect(() => normalizeExerciseRuntime({ title: "Invalid" })).toThrow(ExerciseContractError)
  })
})
