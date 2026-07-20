import { describe, expect, it, vi } from "vitest"

import type { HttpClient } from "@/services/http/HttpClient"
import { LearningPathApiService } from "@/services/learningPaths/LearningPathApiService"

const context = {
  courseId: 10,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("LearningPathApiService", () => {
  it("opens and synchronizes an item using the authenticated HTTP client", async () => {
    const request = vi.fn().mockResolvedValue({ status: 204, headers: {}, data: undefined })
    const service = new LearningPathApiService({ request } as unknown as HttpClient)

    await service.openItem(context, 7, 11, "action-token")
    await service.sync(context, 7, 11, "action-token")

    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "POST",
        path: "/api/learning_paths/7/runtime/item",
        query: { cid: 10, sid: 4 },
        body: {
          itemId: 11,
          allowNewAttempt: false,
          csrfToken: "action-token",
        },
      }),
    )

    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "POST",
        path: "/api/learning_paths/7/runtime/sync",
        query: { cid: 10, sid: 4 },
        body: {
          itemId: 11,
          csrfToken: "action-token",
        },
      }),
    )
  })

  it("restarts the current learning path attempt", async () => {
    const request = vi.fn().mockResolvedValue({ status: 204, headers: {}, data: undefined })
    const service = new LearningPathApiService({ request } as unknown as HttpClient)

    await service.restart(context, 7, "action-token")

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/api/learning_paths/7/runtime/restart",
        body: {
          csrfToken: "action-token",
        },
      }),
    )
  })
})
