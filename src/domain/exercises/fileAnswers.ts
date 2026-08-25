export const EXERCISE_FILE_ANSWER_TYPES = [13, 23] as const
export const ORAL_EXPRESSION_TYPE = 13
export const UPLOAD_ANSWER_TYPE = 23

export function isExerciseFileAnswerType(type: number): boolean {
  return EXERCISE_FILE_ANSWER_TYPES.includes(type as (typeof EXERCISE_FILE_ANSWER_TYPES)[number])
}

export function exerciseFileAccept(type: number): string | undefined {
  return type === ORAL_EXPRESSION_TYPE ? ".wav,.ogg,audio/wav,audio/ogg" : undefined
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
