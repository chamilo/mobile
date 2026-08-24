import { describe, expect, it } from "vitest"

import { parseExerciseRichAnswerContent } from "@/domain/exercises/richAnswerContent"

describe("exercise rich answer content", () => {
  it("keeps answer text, line breaks and image references", () => {
    expect(
      parseExerciseRichAnswerContent(
        '<p>Option A</p><p><img src="/r/question/file/42" alt="Diagram"></p>',
        "Answer image",
      ),
    ).toEqual([
      { type: "text", text: "Option A" },
      { type: "break" },
      { type: "image", src: "/r/question/file/42", alt: "Diagram" },
    ])
  })

  it("drops executable markup and unsafe image schemes", () => {
    expect(
      parseExerciseRichAnswerContent(
        '<script>alert(1)</script><img src="javascript:alert(1)"><strong>Safe text</strong>',
        "Answer image",
      ),
    ).toEqual([{ type: "text", text: "Safe text" }])
  })

  it("uses an accessible fallback alt and allows raster data images", () => {
    const result = parseExerciseRichAnswerContent(
      '<img src="data:image/png;base64,AA=="><img src="data:image/svg+xml;base64,AA==">',
      "Answer image",
    )

    expect(result).toEqual([
      { type: "image", src: "data:image/png;base64,AA==", alt: "Answer image" },
    ])
  })
})
