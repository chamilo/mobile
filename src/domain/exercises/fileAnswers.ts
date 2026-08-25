export const EXERCISE_FILE_ANSWER_TYPES = [13, 23, 30] as const
export const ORAL_EXPRESSION_TYPE = 13
export const UPLOAD_ANSWER_TYPE = 23
export const OFFICE_DOCUMENT_TYPE = 30
export const OFFICE_DOCUMENT_EXTENSIONS = ["doc", "docx", "xls", "xlsx"] as const

export function isExerciseFileAnswerType(type: number): boolean {
  return EXERCISE_FILE_ANSWER_TYPES.includes(type as (typeof EXERCISE_FILE_ANSWER_TYPES)[number])
}

export function exerciseOfficeDocumentExtension(fileName: string): string | null {
  const normalized = fileName.trim().toLowerCase()
  const separator = normalized.lastIndexOf(".")
  if (separator < 0 || separator === normalized.length - 1) return null

  const extension = normalized.slice(separator + 1)
  return OFFICE_DOCUMENT_EXTENSIONS.includes(
    extension as (typeof OFFICE_DOCUMENT_EXTENSIONS)[number],
  )
    ? extension
    : null
}

export function exerciseOfficeDocumentFileMatchesTemplate(
  fileName: string,
  templateName: string,
): boolean {
  const fileExtension = exerciseOfficeDocumentExtension(fileName)
  const templateExtension = exerciseOfficeDocumentExtension(templateName)

  if (!fileExtension) return false
  return templateExtension ? fileExtension === templateExtension : true
}

export function exerciseFileAccept(type: number, templateName = ""): string | undefined {
  if (type === ORAL_EXPRESSION_TYPE) return ".wav,.ogg,audio/wav,audio/ogg"
  if (type !== OFFICE_DOCUMENT_TYPE) return undefined

  const templateExtension = exerciseOfficeDocumentExtension(templateName)
  return templateExtension
    ? `.${templateExtension}`
    : OFFICE_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",")
}

export async function encodeExerciseAnswerFile(file: File): Promise<{
  fileName: string
  mimeType: string
  base64Content: string
}> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunkSize = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }

  return {
    fileName: file.name || "answer-file",
    mimeType: file.type || "application/octet-stream",
    base64Content: globalThis.btoa(binary),
  }
}
