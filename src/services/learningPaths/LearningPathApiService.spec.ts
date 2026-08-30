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

  it("downloads and commits a SCORM runtime package", async () => {
    const packageBuffer = new ArrayBuffer(8)
    const request = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, headers: {}, data: packageBuffer })
      .mockResolvedValueOnce({ status: 204, headers: {}, data: undefined })
    const service = new LearningPathApiService({ request } as unknown as HttpClient)

    await expect(service.getScormPackage(context, 7, 11)).resolves.toBe(packageBuffer)
    await service.commitScorm(
      context,
      7,
      11,
      {
        enabled: true,
        version: "1.2",
        itemViewId: 22,
        lpViewId: 8,
        userId: 4,
        lpType: 2,
        itemType: "sco",
        forceCommit: false,
        debug: false,
        values: {},
        packageEntryPath: "index.html",
        packageParameters: "lang=en",
        packageFingerprint: "a".repeat(64),
        packageSize: 8,
      },
      "action-token",
      {
        values: { "cmi.core.lesson_status": "completed" },
        changedKeys: ["cmi.core.lesson_status"],
        terminated: true,
        reason: "terminate",
      },
    )

    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        path: "/api/learning_paths/7/runtime/scorm/package",
        query: { cid: 10, sid: 4, itemId: 11 },
        responseType: "arraybuffer",
        timeoutMs: 600_000,
        affectsCampusReachability: false,
      }),
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "POST",
        path: "/api/learning_paths/7/runtime/scorm/commit",
        query: { cid: 10, sid: 4 },
        body: expect.objectContaining({
          itemId: 11,
          itemViewId: 22,
          version: "1.2",
          terminated: true,
          csrfToken: "action-token",
        }),
      }),
    )
  })
})
