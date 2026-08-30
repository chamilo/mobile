import { describe, expect, it } from "vitest"
import { strToU8, zipSync } from "fflate"

import {
  extractWebScormArchive,
  normalizeWebScormArchivePath,
  resolveWebScormLaunchPath,
} from "@/services/learningPaths/WebScormPackageHost"

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength)
  copy.set(value)
  return copy.buffer
}

describe("web SCORM package runtime", () => {
  it("normalizes safe package paths and rejects traversal", () => {
    expect(normalizeWebScormArchivePath("/course/./lesson/index.html")).toBe(
      "course/lesson/index.html",
    )
    expect(() => normalizeWebScormArchivePath("../index.html")).toThrow(
      "The SCORM package path is unsafe.",
    )
    expect(() => normalizeWebScormArchivePath("C:\\course\\index.html")).toThrow(
      "The SCORM package path is invalid.",
    )
  })

  it("resolves exact and unique suffix launch paths", () => {
    const paths = ["course/index.html", "course/assets/app.js"]

    expect(resolveWebScormLaunchPath(paths, "course/index.html")).toBe("course/index.html")
    expect(resolveWebScormLaunchPath(paths, "import-123/course/index.html")).toBe(
      "course/index.html",
    )
  })

  it("rejects ambiguous suffix launch paths", () => {
    expect(() =>
      resolveWebScormLaunchPath(["first/index.html", "second/index.html"], "index.html"),
    ).toThrow("The SCORM launch path is ambiguous in the package.")
  })

  it("extracts a real ZIP and preserves relative package files", async () => {
    const archive = zipSync({
      "course/index.html": strToU8('<script src="assets/app.js"></script>'),
      "course/assets/app.js": strToU8('window.lessonReady = true'),
      "course/assets/style.css": strToU8("body { margin: 0; }"),
    })

    const extracted = await extractWebScormArchive(
      toArrayBuffer(archive),
      "import-prefix/course/index.html",
    )

    expect(extracted.launchPath).toBe("course/index.html")
    expect([...extracted.files.keys()].sort()).toEqual([
      "course/assets/app.js",
      "course/assets/style.css",
      "course/index.html",
    ])
    expect(extracted.uncompressedSize).toBeGreaterThan(0)
  })

  it("rejects unsafe archive entries before mounting the package", async () => {
    const archive = zipSync({
      "../outside.html": strToU8("unsafe"),
      "course/index.html": strToU8("safe"),
    })

    await expect(
      extractWebScormArchive(toArrayBuffer(archive), "course/index.html"),
    ).rejects.toMatchObject({ code: "install_failed" })
  })
})
