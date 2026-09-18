// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { prepareResponsiveHtmlDocument } from "@/domain/learningPaths/contentViewer"

describe("learning path translated HTML viewer", () => {
  it("keeps only the resolved language in a complete HTML lesson", () => {
    const html = prepareResponsiveHtmlDocument(
      [
        "<!doctype html><html><head><title>Lesson</title></head><body>",
        '<div class="mce-translatehtml" lang="en"><p>English lesson</p></div>',
        '<div class="mce-translatehtml" lang="es"><p>Lección en español</p></div>',
        "</body></html>",
      ].join(""),
      "es",
      ["en_US"],
    )

    expect(html).toContain("data-chamilo-mobile-document")
    expect(html).toContain("Lección en español")
    expect(html).not.toContain("English lesson")
  })
})
