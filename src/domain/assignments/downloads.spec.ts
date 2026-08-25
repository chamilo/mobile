import { describe, expect, it } from "vitest"

import {
  assignmentDownloadFilename,
  assignmentDownloadPath,
} from "@/domain/assignments/downloads"

describe("assignment downloads", () => {
  it("keeps a campus-relative download path and query string", () => {
    expect(
      assignmentDownloadPath(
        "/r/student_publication/student_publications/abc/download?disposition=attachment",
      ),
    ).toBe("/r/student_publication/student_publications/abc/download?disposition=attachment")
  })

  it("rejects absolute and protocol-relative download URLs", () => {
    expect(assignmentDownloadPath("https://other.example/file.pdf")).toBeNull()
    expect(assignmentDownloadPath("//other.example/file.pdf")).toBeNull()
  })

  it("uses an RFC 5987 filename when the campus provides one", () => {
    expect(
      assignmentDownloadFilename(
        "attachment; filename*=UTF-8''Tarea%20final%20alumno.pdf",
        "submission-10",
      ),
    ).toBe("Tarea final alumno.pdf")
  })

  it("uses and sanitizes a regular content-disposition filename", () => {
    expect(
      assignmentDownloadFilename('attachment; filename="../respuesta\\final?.txt"', "submission-10"),
    ).toBe("final-.txt")
  })

  it("falls back to a safe local filename", () => {
    expect(assignmentDownloadFilename(null, "submission-10")).toBe("submission-10")
  })
})
