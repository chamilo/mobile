const OFFICE_EXTENSIONS = ["doc", "docx", "xls", "xlsx"] as const

export type OfficeAnswerExtension = (typeof OFFICE_EXTENSIONS)[number]

export function officeAnswerExtension(fileName: string): OfficeAnswerExtension | null {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/)
  const extension = match?.[1] ?? ""

  return OFFICE_EXTENSIONS.includes(extension as OfficeAnswerExtension)
    ? (extension as OfficeAnswerExtension)
    : null
}

export function isSupportedOfficeAnswerFile(fileName: string): boolean {
  return officeAnswerExtension(fileName) !== null
}

export function matchesOfficeAnswerTemplate(fileName: string, templateName: string): boolean {
  const fileExtension = officeAnswerExtension(fileName)
  const templateExtension = officeAnswerExtension(templateName)

  if (!fileExtension) return false
  return !templateExtension || fileExtension === templateExtension
}

export function officeAnswerAccept(templateName: string): string {
  const templateExtension = officeAnswerExtension(templateName)

  if (templateExtension) return `.${templateExtension}`
  return OFFICE_EXTENSIONS.map((extension) => `.${extension}`).join(",")
}
