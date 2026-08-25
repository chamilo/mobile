import type {
  ExerciseAnnotationPath,
  ExerciseAnnotationPoint,
  ExerciseAnnotationText,
} from "@/domain/exercises/types"

export interface ExerciseAnnotationImageGeometry {
  left: number
  top: number
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

export interface ExerciseSavedAnnotation {
  paths: ExerciseAnnotationPath[]
  texts: ExerciseAnnotationText[]
}

export function exerciseAnnotationPointFromClientCoordinates(
  clientX: number,
  clientY: number,
  geometry: ExerciseAnnotationImageGeometry,
): ExerciseAnnotationPoint | null {
  if (
    geometry.width <= 0 ||
    geometry.height <= 0 ||
    geometry.naturalWidth <= 0 ||
    geometry.naturalHeight <= 0
  ) {
    return null
  }

  const relativeX = Math.min(Math.max(clientX - geometry.left, 0), geometry.width)
  const relativeY = Math.min(Math.max(clientY - geometry.top, 0), geometry.height)

  return {
    x: Math.round((relativeX / geometry.width) * geometry.naturalWidth),
    y: Math.round((relativeY / geometry.height) * geometry.naturalHeight),
  }
}

export function exerciseAnnotationPointPercent(
  point: ExerciseAnnotationPoint,
  naturalWidth: number,
  naturalHeight: number,
): { left: string; top: string } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { left: "0%", top: "0%" }
  }

  return {
    left: `${(point.x / naturalWidth) * 100}%`,
    top: `${(point.y / naturalHeight) * 100}%`,
  }
}

export function parseSavedExerciseAnnotation(rows: Array<{ answer: string }>): ExerciseSavedAnnotation {
  const result: ExerciseSavedAnnotation = { paths: [], texts: [] }
  const value = rows[0]?.answer ?? ""

  for (const item of value.split("|")) {
    const parts = item.split(")(")
    const type = parts.shift()

    if (type === "P") {
      const points = parts.map(decodeAnnotationPoint).filter(isAnnotationPoint)
      if (points.length >= 2) result.paths.push({ points })
      continue
    }

    if (type === "T" && parts.length >= 2) {
      const text = String(parts.shift() ?? "").trim()
      const point = decodeAnnotationPoint(parts[0] ?? "")
      if (text && point) result.texts.push({ text, ...point })
    }
  }

  return result
}

export function normalizeExerciseAnnotationPaths(
  paths: ExerciseAnnotationPath[],
): ExerciseAnnotationPath[] {
  return paths
    .map((path) => ({
      points: path.points
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        .map((point) => ({ x: Math.max(0, Math.round(point.x)), y: Math.max(0, Math.round(point.y)) })),
    }))
    .filter((path) => path.points.length >= 2)
}

export function normalizeExerciseAnnotationTexts(
  texts: ExerciseAnnotationText[],
): ExerciseAnnotationText[] {
  return texts
    .map((item) => ({
      text: item.text.trim(),
      x: Math.max(0, Math.round(item.x)),
      y: Math.max(0, Math.round(item.y)),
    }))
    .filter((item) => item.text.length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y))
}

function decodeAnnotationPoint(value: string): ExerciseAnnotationPoint | null {
  const [rawX, rawY] = value.split(";")
  const x = Number(rawX)
  const y = Number(rawY)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  return { x, y }
}

function isAnnotationPoint(point: ExerciseAnnotationPoint | null): point is ExerciseAnnotationPoint {
  return point !== null
}
