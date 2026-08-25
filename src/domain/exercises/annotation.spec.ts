import { describe, expect, it } from "vitest"

import {
  exerciseAnnotationPointFromClientCoordinates,
  exerciseAnnotationPointPercent,
  normalizeExerciseAnnotationPaths,
  normalizeExerciseAnnotationTexts,
  parseSavedExerciseAnnotation,
} from "@/domain/exercises/annotation"

describe("exercise annotation", () => {
  it("maps pointer coordinates from the rendered image to natural image coordinates", () => {
    expect(
      exerciseAnnotationPointFromClientCoordinates(160, 120, {
        left: 10,
        top: 20,
        width: 300,
        height: 200,
        naturalWidth: 1200,
        naturalHeight: 800,
      }),
    ).toEqual({ x: 600, y: 400 })
  })

  it("clamps pointer coordinates to the image bounds", () => {
    expect(
      exerciseAnnotationPointFromClientCoordinates(-20, 999, {
        left: 10,
        top: 20,
        width: 300,
        height: 200,
        naturalWidth: 1200,
        naturalHeight: 800,
      }),
    ).toEqual({ x: 0, y: 800 })
  })

  it("parses legacy-compatible saved annotation paths and texts", () => {
    expect(
      parseSavedExerciseAnnotation([
        { answer: "P)(10;20)(30;40)(50;60|T)(Important)(75;90" },
      ]),
    ).toEqual({
      paths: [
        {
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
            { x: 50, y: 60 },
          ],
        },
      ],
      texts: [{ text: "Important", x: 75, y: 90 }],
    })
  })

  it("drops incomplete paths and empty text entries from the answer payload", () => {
    expect(
      normalizeExerciseAnnotationPaths([
        { points: [{ x: 1, y: 2 }] },
        {
          points: [
            { x: 2.4, y: 3.6 },
            { x: 8.9, y: 9.1 },
          ],
        },
      ]),
    ).toEqual([
      {
        points: [
          { x: 2, y: 4 },
          { x: 9, y: 9 },
        ],
      },
    ])

    expect(
      normalizeExerciseAnnotationTexts([
        { text: "   ", x: 1, y: 2 },
        { text: " Note ", x: 12.2, y: 15.8 },
      ]),
    ).toEqual([{ text: "Note", x: 12, y: 16 }])
  })

  it("positions overlay elements proportionally to the natural image size", () => {
    expect(exerciseAnnotationPointPercent({ x: 300, y: 200 }, 1200, 800)).toEqual({
      left: "25%",
      top: "25%",
    })
  })
})
