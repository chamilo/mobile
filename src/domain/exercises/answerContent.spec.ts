// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { exerciseChoiceContent } from "@/domain/exercises/answerContent"

describe("exercise answer content", () => {
  it("extracts safe raster image answers including deterministic data URIs", () => {
    const content = exerciseChoiceContent(
      '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="Regression image" width="320" height="180"></p>',
    )

    expect(content).toEqual({
      text: "",
      images: [
        {
          src: "data:image/png;base64,iVBORw0KGgo=",
          alt: "Regression image",
          width: 320,
          height: 180,
        },
      ],
    })
  })

  it("drops executable markup and unsafe image sources", () => {
    const content = exerciseChoiceContent(
      '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)" alt="Unsafe">',
    )

    expect(content).toEqual({ text: "", images: [] })
  })

  it("keeps HTTP image sources, rejects SVG data URIs and preserves safe text", () => {
    const content = exerciseChoiceContent(
      '<p>Campus image <img src="https://campus.example/image.png" alt="Remote"></p><img src="data:image/svg+xml;base64,PHN2Zz4=" alt="SVG">',
    )

    expect(content.text).toBe("Campus image")
    expect(content.images).toEqual([
      {
        src: "https://campus.example/image.png",
        alt: "Remote",
      },
    ])
  })
})
