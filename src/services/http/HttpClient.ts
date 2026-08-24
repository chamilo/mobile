export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
export type HttpResponseType = "json" | "text" | "blob" | "arraybuffer"

export interface HttpMultipartFilePart {
  fieldName: string
  fileName: string
  contentType: string
  base64: string
}

export interface HttpMultipartBody {
  type: "multipart"
  fields: Record<string, string>
  files: HttpMultipartFilePart[]
}

export function isHttpMultipartBody(value: unknown): value is HttpMultipartBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<HttpMultipartBody>
  return (
    candidate.type === "multipart" &&
    Boolean(candidate.fields) &&
    typeof candidate.fields === "object" &&
    !Array.isArray(candidate.fields) &&
    Array.isArray(candidate.files)
  )
}

export interface HttpRequest<TBody = unknown> {
  method: HttpMethod
  path: string
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | null | undefined>
  body?: TBody
  timeoutMs?: number
  signal?: AbortSignal
  responseType?: HttpResponseType
}

export interface HttpResponse<TData> {
  status: number
  headers: Record<string, string>
  data: TData
}

export interface HttpClient {
  request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>>
}
