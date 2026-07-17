import {
  CapacitorHttp,
  type HttpOptions,
  type HttpResponse as CapacitorHttpResponse,
} from "@capacitor/core"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

const DEFAULT_TIMEOUT_MS = 10_000

function normalizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)]),
  )
}

function buildRequestUrl(baseUrl: URL, request: HttpRequest<unknown>): URL {
  if (!request.path || /^https?:\/\//i.test(request.path) || request.path.startsWith("//")) {
    throw new HttpClientError(
      "configuration",
      "HTTP request paths must be relative to the selected campus.",
    )
  }

  const url = new URL(request.path.replace(/^\/+/, ""), baseUrl)

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

function normalizeNativeError(error: unknown): HttpClientError {
  if (error instanceof HttpClientError) {
    return error
  }

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return new HttpClientError("timeout", "The request timed out.", undefined, error)
  }

  return new HttpClientError("network", "The campus could not be reached.", undefined, error)
}

function rejectWhenAborted(signal: AbortSignal | undefined): Promise<never> | null {
  if (!signal) {
    return null
  }

  if (signal.aborted) {
    return Promise.reject(new HttpClientError("aborted", "The request was cancelled."))
  }

  return new Promise((_, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new HttpClientError("aborted", "The request was cancelled.")),
      { once: true },
    )
  })
}

export class NativeHttpClient implements HttpClient {
  private readonly baseUrl: URL

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
  }

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    const url = buildRequestUrl(this.baseUrl, request)
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const options: HttpOptions = {
      method: request.method,
      url: url.toString(),
      headers: request.headers,
      data: request.body,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      disableRedirects: true,
      responseType: "json",
    }

    const nativeRequest = CapacitorHttp.request(options)
    const abortRequest = rejectWhenAborted(request.signal)

    try {
      const response = (await (abortRequest
        ? Promise.race([nativeRequest, abortRequest])
        : nativeRequest)) as CapacitorHttpResponse

      if (response.url && new URL(response.url).origin !== this.baseUrl.origin) {
        throw new HttpClientError(
          "redirect",
          "The campus redirected the request to a different host.",
        )
      }

      if (response.status < 200 || response.status >= 300) {
        throw new HttpClientError(
          "http",
          `The server returned HTTP ${response.status}.`,
          response.status,
        )
      }

      return {
        status: response.status,
        headers: normalizeHeaders(response.headers),
        data: response.data as TData,
      }
    } catch (error) {
      throw normalizeNativeError(error)
    }
  }
}
