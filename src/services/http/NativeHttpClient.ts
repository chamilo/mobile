import {
  CapacitorHttp,
  type HttpOptions,
  type HttpResponse as CapacitorHttpResponse,
} from "@capacitor/core"

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
  HttpResponseType,
} from "@/services/http/HttpClient"
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

function base64Payload(value: string): string {
  const marker = ";base64,"
  const markerIndex = value.indexOf(marker)

  return markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value
}

function decodeBase64(value: string): ArrayBuffer {
  try {
    const binary = globalThis.atob(base64Payload(value))
    const buffer = new ArrayBuffer(binary.length)
    const bytes = new Uint8Array(buffer)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return buffer
  } catch (error) {
    throw new HttpClientError(
      "unsupported",
      "The native HTTP response could not be decoded.",
      undefined,
      error,
    )
  }
}

function normalizeResponseData<TData>(
  data: unknown,
  responseType: HttpResponseType,
  headers: Record<string, string>,
): TData {
  if (responseType === "blob") {
    if (data instanceof Blob) {
      return data as TData
    }

    if (typeof data !== "string") {
      throw new HttpClientError("unsupported", "The native HTTP response is not a file.")
    }

    return new Blob([decodeBase64(data)], {
      type: headers["content-type"] || "application/octet-stream",
    }) as TData
  }

  if (responseType === "arraybuffer") {
    if (data instanceof ArrayBuffer) {
      return data as TData
    }

    if (typeof data !== "string") {
      throw new HttpClientError("unsupported", "The native HTTP response is not an array buffer.")
    }

    return decodeBase64(data) as TData
  }

  return data as TData
}

export class NativeHttpClient implements HttpClient {
  private readonly baseUrl: URL

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
  }

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    const url = buildRequestUrl(this.baseUrl, request)
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const responseType = request.responseType ?? "json"
    const options: HttpOptions = {
      method: request.method,
      url: url.toString(),
      headers: request.headers,
      data: request.body,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      disableRedirects: true,
      responseType,
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

      const headers = normalizeHeaders(response.headers)

      return {
        status: response.status,
        headers,
        data: normalizeResponseData<TData>(response.data, responseType, headers),
      }
    } catch (error) {
      throw normalizeNativeError(error)
    }
  }
}
