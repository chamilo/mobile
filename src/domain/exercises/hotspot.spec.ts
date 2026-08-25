import { describe, expect, it } from "vitest"

import {
  exerciseHotspotPointFromClientCoordinates,
  exerciseHotspotPointPercent,
  parseSavedExerciseHotspotPoints,
} from "@/domain/exercises/hotspot"

describe("exercise hotspot helpers", () => {
  it("maps a pointer on a responsive image back to original image coordinates", () => {
    expect(
      exerciseHotspotPointFromClientCoordinates(160, 95, {
        left: 10,
        top: 20,
        width: 300,
        height: 150,
        naturalWidth: 1200,
        naturalHeight: 600,
      }),
    ).toEqual({ x: 600, y: 300 })
  })

  it("clamps pointer coordinates to the image bounds", () => {
    expect(
      exerciseHotspotPointFromClientCoordinates(500, -20, {
        left: 10,
        top: 20,
        width: 300,
        height: 150,
        naturalWidth: 1200,
        naturalHeight: 600,
      }),
    ).toEqual({ x: 1200, y: 0 })
  })

  it("restores hotspot and delineation points from the verified saved row format", () => {
    expect(
      parseSavedExerciseHotspotPoints([
        { answer: "15:120;75|260;190|300;240", position: 0 },
      ]),
    ).toEqual([
      { x: 120, y: 75, answerId: 15 },
      { x: 260, y: 190 },
      { x: 300, y: 240 },
    ])
  })

  it("builds responsive overlay percentages from original coordinates", () => {
    expect(exerciseHotspotPointPercent({ x: 300, y: 150 }, 1200, 600)).toEqual({
      left: "25%",
      top: "25%",
    })
  })
})
