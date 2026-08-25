import type { ExerciseHotspotPoint, SavedAnswerRow } from "@/domain/exercises/types"

export interface ExerciseHotspotImageGeometry {
  left: number
  top: number
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function exerciseHotspotPointFromClientCoordinates(
  clientX: number,
  clientY: number,
  geometry: ExerciseHotspotImageGeometry,
): ExerciseHotspotPoint | null {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    !finitePositive(geometry.width) ||
    !finitePositive(geometry.height) ||
    !finitePositive(geometry.naturalWidth) ||
    !finitePositive(geometry.naturalHeight)
  ) {
    return null
  }

  const relativeX = Math.min(geometry.width, Math.max(0, clientX - geometry.left))
  const relativeY = Math.min(geometry.height, Math.max(0, clientY - geometry.top))

  return {
    x: Math.round((relativeX / geometry.width) * geometry.naturalWidth),
    y: Math.round((relativeY / geometry.height) * geometry.naturalHeight),
  }
}

export function parseSavedExerciseHotspotPoints(rows: SavedAnswerRow[]): ExerciseHotspotPoint[] {
  const points: ExerciseHotspotPoint[] = []

  for (const row of rows) {
    for (const rawCoordinate of String(row.answer ?? "").split("|")) {
      const coordinate = rawCoordinate.trim()
      if (!coordinate) continue

      let answerId: number | undefined
      let coordinateValue = coordinate
      const separatorIndex = coordinate.indexOf(":")

      if (separatorIndex > 0) {
        const candidate = Number(coordinate.slice(0, separatorIndex))
        if (Number.isInteger(candidate) && candidate > 0) {
          answerId = candidate
          coordinateValue = coordinate.slice(separatorIndex + 1)
        }
      }

      const [xValue, yValue] = coordinateValue.split(";", 2)
      const x = Number(xValue)
      const y = Number(yValue)

      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) continue

      points.push({
        x: Math.round(x),
        y: Math.round(y),
        ...(answerId ? { answerId } : {}),
      })
    }
  }

  return points
}

export function exerciseHotspotPointPercent(
  point: ExerciseHotspotPoint,
  naturalWidth: number,
  naturalHeight: number,
): { left: string; top: string } {
  if (!finitePositive(naturalWidth) || !finitePositive(naturalHeight)) {
    return { left: "0%", top: "0%" }
  }

  const x = Math.min(naturalWidth, Math.max(0, point.x))
  const y = Math.min(naturalHeight, Math.max(0, point.y))

  return {
    left: `${(x / naturalWidth) * 100}%`,
    top: `${(y / naturalHeight) * 100}%`,
  }
}
