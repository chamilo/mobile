import { describe, expect, it } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ExerciseRuntime } from "@/domain/exercises/types"
import {
  buildExerciseOfflineStateKey,
  isRestorableExerciseOfflineState,
  OFFLINE_EXERCISE_STATE_VERSION,
} from "@/services/offline/OfflineExerciseState"

const directContext: CourseNavigationContext = {
  courseId: 31,
  sessionId: null,
  membershipId: 73,
  sessionCourseId: null,
  source: "direct",
}

const sessionContext: CourseNavigationContext = {
  courseId: 31,
  sessionId: 4,
  membershipId: 73,
  sessionCourseId: 91,
  source: "session",
}

const runtime = {
  exerciseId: 16,
  title: "Exercise",
  description: "",
  settings: {},
  questions: [],
  questionCount: 0,
  totalScore: 0,
  canManage: false,
  legacyUrls: {},
  attempt: null,
  canStartAttempt: true,
  canSubmit: false,
  usesLegacySubmit: false,
} satisfies ExerciseRuntime

describe("Offline exercise state", () => {
  it("isolates durable answers by the complete enrollment context", () => {
    expect(buildExerciseOfflineStateKey(directContext, 16)).not.toBe(
      buildExerciseOfflineStateKey(sessionContext, 16),
    )
  })

  it("rejects stale state without a prepared attempt", () => {
    expect(
      isRestorableExerciseOfflineState(
        {
          version: OFFLINE_EXERCISE_STATE_VERSION,
          exerciseId: 16,
          runtime,
        },
        16,
      ),
    ).toBe(false)
  })
})
