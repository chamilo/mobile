import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
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
    const config: AxiosRequestConfig<TBody> = {
      method: request.method,
      url: url.toString(),
      headers: request.headers,
      params: request.query,
      data: request.body,
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
