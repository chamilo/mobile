import { describe, expect, it } from "vitest"

import {
  inspectLearningPathContent,
  prepareResponsiveHtmlDocument,
} from "@/domain/learningPaths/contentViewer"

describe("learning path content viewer", () => {
  it("detects HTML returned as application/octet-stream without a file extension", async () => {
    const blob = new Blob(["<!doctype html><html><body><h1>Lesson</h1></body></html>"], {
      type: "application/octet-stream",
    })

    await expect(inspectLearningPathContent(blob, "Module 1: Introduction")).resolves.toMatchObject(
      {
        kind: "html",
        mimeType: "text/html",
      },
    )
  })

  it("uses the content URL extension when the visible item title has no extension", async () => {
    const blob = new Blob(["<p>Lesson</p>"], { type: "application/octet-stream" })

    await expect(
      inspectLearningPathContent(blob, "Module 1", "/documents/module-1.html?cid=3"),
    ).resolves.toMatchObject({
      kind: "html",
      mimeType: "text/html",
    })
  })

  it("detects a PDF signature returned with a generic MIME type", async () => {
    const blob = new Blob(["%PDF-1.7\n"], { type: "application/octet-stream" })

    await expect(inspectLearningPathContent(blob, "Reference material")).resolves.toMatchObject({
      kind: "frame",
      mimeType: "application/pdf",
    })
  })

  it("keeps unknown binary files as unsupported", async () => {
    const blob = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], {
      type: "application/octet-stream",
    })

    await expect(inspectLearningPathContent(blob, "Attachment")).resolves.toMatchObject({
      kind: "unsupported",
    })
  })

  it("adds mobile viewport and responsive content rules to HTML fragments", () => {
    const html = prepareResponsiveHtmlDocument("<p>Hello</p>")

    expect(html).toContain('name="viewport"')
    expect(html).toContain("data-chamilo-mobile-document")
    expect(html).toContain("<body><p>Hello</p></body>")
  })
})
