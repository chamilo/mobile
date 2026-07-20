import { describe, expect, it, vi } from "vitest"

import { AgendaApiService } from "@/services/agenda/AgendaApiService"
import type { HttpClient } from "@/services/http/HttpClient"

describe("AgendaApiService", () => {
  it("requests the course agenda with date filters", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        "hydra:member": [],
        "hydra:totalItems": 0,
      },
      status: 200,
      headers: {},
    })
    const service = new AgendaApiService({ request } as unknown as HttpClient)

    await service.getList({
      courseId: 10,
      sessionId: 7,
      membershipId: null,
      sessionCourseId: 9,
      source: "session",
    })

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/c_calendar_events",
      query: expect.objectContaining({
        cid: 10,
        sid: 7,
        itemsPerPage: 5000,
      }),
      headers: { Accept: "application/ld+json" },
    })
  })
})
