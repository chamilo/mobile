import { describe, expect, it } from "vitest"

import {
  isSupportedOfficeAnswerFile,
  matchesOfficeAnswerTemplate,
  officeAnswerAccept,
  officeAnswerExtension,
} from "@/domain/exercises/officeAnswer"

describe("Office exercise answer files", () => {
  it("recognizes the Office formats supported by the Chamilo runtime", () => {
    expect(officeAnswerExtension("answer.DOCX")).toBe("docx")
    expect(officeAnswerExtension("sheet.xlsx")).toBe("xlsx")
    expect(isSupportedOfficeAnswerFile("legacy.doc")).toBe(true)
    expect(isSupportedOfficeAnswerFile("legacy.xls")).toBe(true)
    expect(isSupportedOfficeAnswerFile("notes.pdf")).toBe(false)
  })

  it("requires the completed answer to keep the template format", () => {
    expect(matchesOfficeAnswerTemplate("completed.docx", "template.docx")).toBe(true)
    expect(matchesOfficeAnswerTemplate("completed.xlsx", "template.docx")).toBe(false)
    expect(matchesOfficeAnswerTemplate("completed.pdf", "template.docx")).toBe(false)
  })

  it("narrows the file picker when the template extension is known", () => {
    expect(officeAnswerAccept("template.xlsx")).toBe(".xlsx")
    expect(officeAnswerAccept("template")).toBe(".doc,.docx,.xls,.xlsx")
  })
})
