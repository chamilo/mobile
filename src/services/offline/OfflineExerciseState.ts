import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ExerciseAnswerState, ExerciseRuntime } from "@/domain/exercises/types"

export const OFFLINE_EXERCISE_STATE_VERSION = 2 as const

export interface ExerciseTimerAnchor {
  attemptId: number
  remainingSeconds: number | null
  capturedAt: string
}

export interface ExerciseOfflineState {
  version: typeof OFFLINE_EXERCISE_STATE_VERSION
  exerciseId: number
  runtime: ExerciseRuntime
  answers: Record<number, ExerciseAnswerState>
  currentQuestionIndex: number
  savedQuestionIds: number[]
  reviewQuestionIds: number[]
  timerAnchor: ExerciseTimerAnchor | null
}

export function buildExerciseOfflineStateKey(
  context: CourseNavigationContext,
  exerciseId: number,
): string {
  return [
    "exercise-runtime-v2",
    context.courseId,
    context.sessionId ?? 0,
    context.membershipId ?? 0,
    context.sessionCourseId ?? 0,
    context.source,
    exerciseId,
  ].join(":")
}

export function isRestorableExerciseOfflineState(
  value: unknown,
  exerciseId: number,
): value is ExerciseOfflineState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const state = value as Partial<ExerciseOfflineState>

  return (
    state.version === OFFLINE_EXERCISE_STATE_VERSION &&
    state.exerciseId === exerciseId &&
    Boolean(state.runtime?.attempt)
  )
}
