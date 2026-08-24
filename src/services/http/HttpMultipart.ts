import type { HttpMultipartBody, HttpMultipartFilePart } from "@/services/http/HttpClient"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }

  return globalThis.btoa(binary)
}

export async function createHttpMultipartFilePart(
  fieldName: string,
  file: File,
): Promise<HttpMultipartFilePart> {
  return {
    fieldName,
    fileName: file.name || "upload.bin",
    contentType: file.type || "application/octet-stream",
    base64: arrayBufferToBase64(await file.arrayBuffer()),
  }
}

export async function createHttpMultipartBody(
  fields: Record<string, string | number | boolean>,
  files: Array<{ fieldName: string; file: File }>,
): Promise<HttpMultipartBody> {
  const encodedFiles = await Promise.all(
    files.map(({ fieldName, file }) => createHttpMultipartFilePart(fieldName, file)),
  )

  return {
    type: "multipart",
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)])),
    files: encodedFiles,
  }
}
