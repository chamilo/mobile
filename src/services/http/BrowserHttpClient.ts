import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios"

import {
  isHttpMultipartBody,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

const DEFAULT_TIMEOUT_MS = 10_000

function normalizeHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== "object") {
    return {}
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]),
  )
}

function getResponseUrl(request: unknown): string | null {
  if (!request || typeof request !== "object" || !("responseURL" in request)) {
    return null
  }

  const responseUrl = request.responseURL

  return typeof responseUrl === "string" && responseUrl ? responseUrl : null
}

function normalizeAxiosError(error: unknown): HttpClientError {
  if (!(error instanceof AxiosError)) {
    return new HttpClientError("network", "The request failed unexpectedly.", undefined, error)
  }

  if (error.code === AxiosError.ERR_CANCELED) {
    return new HttpClientError("aborted", "The request was cancelled.", undefined, error)
  }

  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new HttpClientError("timeout", "The request timed out.", undefined, error)
  }

  if (error.response) {
    return new HttpClientError(
      "http",
      `The server returned HTTP ${error.response.status}.`,
      error.response.status,
      error,
    )
  }

  return new HttpClientError("network", "The campus could not be reached.", undefined, error)
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = globalThis.atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return buffer
}

function multipartHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined

  const next = { ...headers }
  for (const key of Object.keys(next)) {
    if (key.toLowerCase() === "content-type") delete next[key]
  }
  return next
}

function toBrowserRequestBody(body: unknown): unknown {
  if (!isHttpMultipartBody(body)) return body

  const formData = new FormData()
  for (const [key, value] of Object.entries(body.fields)) {
    formData.append(key, value)
  }
  for (const file of body.files) {
    formData.append(
      file.fieldName,
      new File([decodeBase64(file.base64)], file.fileName, { type: file.contentType }),
    )
  }

  return formData
}

export class BrowserHttpClient implements HttpClient {
  private readonly baseUrl: URL

  constructor(
    baseUrl: string,
    private readonly client: AxiosInstance = axios.create(),
  ) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
  }

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    if (!request.path || /^https?:\/\//i.test(request.path) || request.path.startsWith("//")) {
      throw new HttpClientError(
        "configuration",
        "HTTP request paths must be relative to the selected campus.",
      )
    }

    const url = new URL(request.path.replace(/^\/+/, ""), this.baseUrl)
    const multipart = isHttpMultipartBody(request.body)
    const config: AxiosRequestConfig = {
      method: request.method,
      url: url.toString(),
      headers: multipart ? multipartHeaders(request.headers) : request.headers,
      params: request.query,
      data: toBrowserRequestBody(request.body),
      timeout: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      signal: request.signal,
      validateStatus: (status) => status >= 200 && status < 300,
      responseType: request.responseType,
    }

    try {
      const response = await this.client.request<TData>(config)
      const responseUrl = getResponseUrl(response.request)

      if (responseUrl && new URL(responseUrl).origin !== this.baseUrl.origin) {
        throw new HttpClientError(
          "redirect",
          "The campus redirected the request to a different host.",
        )
      }

      return {
        status: response.status,
        headers: normalizeHeaders(response.headers),
        data: response.data,
      }
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw error
      }

      throw normalizeAxiosError(error)
    }
  }
}
