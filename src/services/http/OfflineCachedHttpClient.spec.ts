import { afterEach, describe, expect, it, vi } from "vitest"

import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import { OfflineCachedHttpClient } from "@/services/http/OfflineCachedHttpClient"
import type { OfflineResponseCacheRepository } from "@/services/offline/OfflineResponseCacheRepository"
import {
  clearOfflineSessionUser,
  setOfflineSessionUser,
} from "@/services/offline/OfflineSessionContext"

class MemoryResponseCache implements OfflineResponseCacheRepository {
  response: HttpResponse<unknown> | null = null

  async load<TData>(): Promise<HttpResponse<TData> | null> {
    return this.response as HttpResponse<TData> | null
  }

  async save<TData>(
    _campusId: string,
    _userId: number,
    _request: HttpRequest,
    response: HttpResponse<TData>,
  ): Promise<void> {
    this.response = structuredClone(response)
  }

  async getStats(): Promise<{ records: number; bytes: number }> {
    return { records: this.response ? 1 : 0, bytes: 0 }
  }

  async clearCourse(): Promise<void> {
    this.response = null
  }

  async clearCampus(): Promise<void> {
    this.response = null
  }
}

afterEach(() => {
  clearOfflineSessionUser()
  vi.restoreAllMocks()
})

describe("OfflineCachedHttpClient", () => {
  it("saves authenticated GET responses and returns them after a network failure", async () => {
    setOfflineSessionUser("campus-a", 7)
    const cache = new MemoryResponseCache()
    let online = true
    const client = {
      request: async () => {
        if (!online) throw new HttpClientError("network", "Offline")
        return { status: 200, headers: {}, data: { value: 42 } }
      },
    } as unknown as HttpClient
    const wrapper = new OfflineCachedHttpClient("campus-a", client, cache)

    await expect(wrapper.request({ method: "GET", path: "/api/test" })).resolves.toMatchObject({
      data: { value: 42 },
    })

    online = false
    await expect(wrapper.request({ method: "GET", path: "/api/test" })).resolves.toMatchObject({
      data: { value: 42 },
    })
  })

  it("never serves a cached response for a write", async () => {
    setOfflineSessionUser("campus-a", 7)
    const cache = new MemoryResponseCache()
    cache.response = { status: 200, headers: {}, data: { stale: true } }
    const client = {
      request: async () => {
        throw new HttpClientError("network", "Offline")
      },
    } as unknown as HttpClient
    const wrapper = new OfflineCachedHttpClient("campus-a", client, cache)

    await expect(wrapper.request({ method: "POST", path: "/api/test" })).rejects.toMatchObject({
      kind: "network",
    })
  })
})
