import { describe, expect, it } from "vitest"

import type { ExerciseAttempt, ExerciseRuntime } from "@/domain/exercises/types"
import {
  buildPreparedExerciseRuntime,
  isPreparedExerciseRuntime,
  selectExerciseRuntimeForPreparedStorage,
} from "@/services/offline/OfflineExercisePreparation"

const runtime = {
  exerciseId: 16,
  title: "Choice and scoring variants",
  description: "",
  settings: {},
  questions: [
    {
      id: 101,
      title: "Question",
      description: "",
      type: 1,
      typeLabel: "Unique answer",
      position: 1,
      mandatory: false,
      duration: null,
      choices: [],
      trueFalseOptions: [],
      fillBlanks: null,
      matching: null,
      draggable: null,
      dropdown: null,
      calculated: null,
      isContent: false,
    },
  ],
  questionCount: 1,
  totalScore: 1,
  canManage: false,
  legacyUrls: {},
  attempt: null,
  canStartAttempt: true,
  canSubmit: false,
  usesLegacySubmit: false,
} satisfies ExerciseRuntime

const attempt = {
  attemptId: 25,
  attemptNumber: 1,
  status: "incomplete",
  success: true,
  message: "",
  currentQuestionIndex: 0,
  currentQuestionId: 101,
  questionIds: [101],
  totalQuestions: 1,
  startedAt: "2026-08-03T20:00:00.000Z",
  expiredAt: null,
  remainingSeconds: null,
  canNavigatePrevious: false,
  canNavigateNext: false,
  canFinish: true,
  usesLegacyRuntime: false,
  savedAnswers: {},
  reviewQuestionIds: [],
} satisfies ExerciseAttempt

describe("Offline exercise preparation", () => {
  it("keeps the authoritative started attempt when the runtime re-read has not exposed it yet", () => {
    const prepared = buildPreparedExerciseRuntime(runtime, attempt)

    expect(prepared.attempt).toEqual(attempt)
    expect(prepared.canStartAttempt).toBe(false)
    expect(prepared.canSubmit).toBe(true)
    expect(isPreparedExerciseRuntime(prepared)).toBe(true)
  })

  it("does not replace an attempt already returned by the runtime endpoint", () => {
    const runtimeAttempt = { ...attempt, attemptId: 26 }
    const prepared = buildPreparedExerciseRuntime({ ...runtime, attempt: runtimeAttempt }, attempt)

    expect(prepared.attempt?.attemptId).toBe(26)
  })

  it("does not overwrite a prepared attempt with a later metadata-only runtime", () => {
    const prepared = buildPreparedExerciseRuntime(runtime, attempt)
    const selected = selectExerciseRuntimeForPreparedStorage(runtime, prepared)

    expect(selected.attempt?.attemptId).toBe(25)
    expect(selected.questions).toEqual(runtime.questions)
  })

  it("rejects metadata-only and legacy runtimes", () => {
    expect(isPreparedExerciseRuntime(runtime)).toBe(false)
    expect(
      isPreparedExerciseRuntime({
        ...runtime,
        attempt: { ...attempt, usesLegacyRuntime: true },
      }),
    ).toBe(false)
  })
})
