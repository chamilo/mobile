import type { ExerciseAttempt, ExerciseRuntime } from "@/domain/exercises/types"

export function buildPreparedExerciseRuntime(
  runtime: ExerciseRuntime,
  startedAttempt: ExerciseAttempt | null,
): ExerciseRuntime {
  const prepared = structuredClone(runtime)

  if (!prepared.attempt && startedAttempt) {
    prepared.attempt = structuredClone(startedAttempt)
  }

  if (prepared.attempt) {
    prepared.canSubmit = prepared.attempt.canFinish
    prepared.canStartAttempt = false
  }

  return prepared
}

export function isPreparedExerciseRuntime(runtime: ExerciseRuntime): boolean {
  const attempt = runtime.attempt

  return Boolean(
    attempt &&
    attempt.success &&
    !attempt.usesLegacyRuntime &&
    attempt.attemptId > 0 &&
    runtime.questions.length > 0,
  )
}
export function selectExerciseRuntimeForPreparedStorage(
  loadedRuntime: ExerciseRuntime,
  existingPreparedRuntime: ExerciseRuntime | null,
): ExerciseRuntime {
  if (!loadedRuntime.attempt && existingPreparedRuntime?.attempt) {
    return structuredClone(existingPreparedRuntime)
  }

  return structuredClone(loadedRuntime)
}
