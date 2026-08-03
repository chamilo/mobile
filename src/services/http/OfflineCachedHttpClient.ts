import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import {
  offlineResponseCacheRepository,
  type OfflineResponseCacheRepository,
} from "@/services/offline/OfflineResponseCacheRepository"
import { getOfflinePrefetchCapture } from "@/services/offline/OfflinePrefetchContext"
import { getOfflineSessionUser } from "@/services/offline/OfflineSessionContext"

function isFallbackEligible(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true
  }

  return error instanceof HttpClientError && (error.kind === "network" || error.kind === "timeout")
}

function canCache(request: HttpRequest): boolean {
  if (request.method !== "GET") {
    return false
  }

  // The extracted Android package is the durable SCORM copy. Avoid duplicating
  // large ZIP archives in IndexedDB.
  return !request.path.includes("/runtime/scorm/package")
}

export class OfflineCachedHttpClient implements HttpClient {
  constructor(
    private readonly campusId: string,
    private readonly client: HttpClient,
    private readonly cache: OfflineResponseCacheRepository = offlineResponseCacheRepository,
  ) {}

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    const userId = getOfflineSessionUser(this.campusId)

    if (!userId || !canCache(request)) {
      return this.client.request<TData, TBody>(request)
    }

    try {
      const response = await this.client.request<TData, TBody>(request)
      const capture = getOfflinePrefetchCapture()
      const savePromise = this.cache.save(
        this.campusId,
        userId,
        request,
        response,
        capture?.courseId,
      )

      if (capture?.strict) {
        await savePromise
      } else {
        await savePromise.catch(() => undefined)
      }

      return response
    } catch (error) {
      if (!isFallbackEligible(error)) {
        throw error
      }

      const cached = await this.cache.load<TData>(this.campusId, userId, request).catch(() => null)

      if (cached) {
        return cached
      }

      throw error
    }
  }
}
