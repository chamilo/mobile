export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
export type HttpResponseType = "json" | "text" | "blob" | "arraybuffer"

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
