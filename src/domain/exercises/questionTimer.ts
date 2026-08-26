import type { ExerciseAttempt } from "@/domain/exercises/types"

export interface ExerciseQuestionTimerAnchor {
  questionId: number
  durationSeconds: number
  savedSeconds: number
  startedAtMs: number
}

export function isClientTimedExerciseQuestion(
  settings: Record<string, unknown>,
  duration: number | null | undefined,
): boolean {
  return (
    settings.allowTimePerQuestion === true &&
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0
  )
}

export function savedExerciseQuestionSeconds(
  attempt: ExerciseAttempt | null | undefined,
  questionId: number,
): number {
  if (!attempt || questionId <= 0) return 0

  const rows = attempt.savedAnswers[String(questionId)] ?? []
  if (!Array.isArray(rows)) return 0

  return rows.reduce(
    (maximum, row) => Math.max(maximum, Math.max(0, Number(row.secondsSpent ?? 0) || 0)),
    0,
  )
}

export function createExerciseQuestionTimerAnchor(
  questionId: number,
  durationSeconds: number | null | undefined,
  savedSeconds = 0,
  startedAtMs = Date.now(),
): ExerciseQuestionTimerAnchor | null {
  if (
    !Number.isInteger(questionId) ||
    questionId <= 0 ||
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return null
  }

  return {
    questionId,
    durationSeconds: Math.max(1, Math.floor(durationSeconds)),
    savedSeconds: Math.max(0, Math.floor(savedSeconds)),
    startedAtMs,
  }
}

export function exerciseQuestionTimerSpentSeconds(
  anchor: ExerciseQuestionTimerAnchor | null,
  nowMs = Date.now(),
): number {
  if (!anchor) return 0

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - anchor.startedAtMs) / 1000))
  return Math.min(anchor.durationSeconds, anchor.savedSeconds + elapsedSeconds)
}

export function exerciseQuestionTimerRemainingSeconds(
  anchor: ExerciseQuestionTimerAnchor | null,
  nowMs = Date.now(),
): number | null {
  if (!anchor) return null

  return Math.max(0, anchor.durationSeconds - exerciseQuestionTimerSpentSeconds(anchor, nowMs))
}
