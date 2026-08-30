import { beforeEach, describe, expect, it, vi } from "vitest"

import type { HttpClient } from "@/services/http/HttpClient"
import { ObservedCampusHttpClient } from "@/services/http/ObservedCampusHttpClient"
import {
  reportCampusRequestFailure,
  reportCampusRequestSuccess,
} from "@/services/offline/CampusRequestMonitor"

vi.mock("@/services/offline/CampusRequestMonitor", () => ({
  reportCampusRequestFailure: vi.fn(),
  reportCampusRequestSuccess: vi.fn(),
}))

describe("ObservedCampusHttpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports ordinary request failures to campus reachability", async () => {
    const error = new Error("request failed")
    const client = {
      request: vi.fn().mockRejectedValue(error),
    } as unknown as HttpClient
    const observed = new ObservedCampusHttpClient("campus-1", client)

    await expect(
      observed.request({
        method: "GET",
        path: "/api/test",
      }),
    ).rejects.toBe(error)

    expect(reportCampusRequestFailure).toHaveBeenCalledWith("campus-1", error)
  })

  it("does not mark the campus unreachable for opted-out long transfers", async () => {
    const error = new Error("request timed out")
    const client = {
      request: vi.fn().mockRejectedValue(error),
    } as unknown as HttpClient
    const observed = new ObservedCampusHttpClient("campus-1", client)

    await expect(
      observed.request({
        method: "GET",
        path: "/api/learning_paths/55/runtime/scorm/package",
        affectsCampusReachability: false,
      }),
    ).rejects.toBe(error)

    expect(reportCampusRequestFailure).not.toHaveBeenCalled()
  })

  it("still reports successful opted-out transfers as campus reachable", async () => {
    const response = { status: 200, headers: {}, data: new ArrayBuffer(1) }
    const client = {
      request: vi.fn().mockResolvedValue(response),
    } as unknown as HttpClient
    const observed = new ObservedCampusHttpClient("campus-1", client)

    await expect(
      observed.request<ArrayBuffer>({
        method: "GET",
        path: "/api/learning_paths/55/runtime/scorm/package",
        affectsCampusReachability: false,
      }),
    ).resolves.toEqual(response)

    expect(reportCampusRequestSuccess).toHaveBeenCalledWith("campus-1")
  })
})
