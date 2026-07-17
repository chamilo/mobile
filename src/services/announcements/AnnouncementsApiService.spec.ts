import { describe, expect, it, vi } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import {
  AnnouncementsApiService,
  AnnouncementsServiceError,
} from "@/services/announcements/AnnouncementsApiService"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

const context: CourseNavigationContext = {
  courseId: 12,
  sessionId: 8,
  membershipId: null,
  sessionCourseId: 44,
  source: "session",
}

const summary = {
  id: 5,
  title: "Welcome",
  author: null,
  createdAt: null,
  updatedAt: null,
  emailSent: false,
  hasAttachments: false,
  attachmentCount: 0,
  displayOrder: 1,
}

describe("AnnouncementsApiService", () => {
  it("forces the read-only student view with course and session context", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        courseId: 12,
        sessionId: 8,
        groupId: null,
        totalItems: 1,
        items: [summary],
      },
    })
    const service = new AnnouncementsApiService({ request } as HttpClient)

    await service.getList(context)

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/api/announcement/list",
        query: { cid: 12, sid: 8, isStudentView: true },
      }),
    )
  })

  it("loads the detail from the verified operation", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        id: 5,
        courseId: 12,
        sessionId: 8,
        groupId: null,
        item: { ...summary, content: "<p>Hello</p>", attachments: [] },
      },
    })
    const service = new AnnouncementsApiService({ request } as HttpClient)

    const detail = await service.getDetail(context, 5)

    expect(detail.item.id).toBe(5)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: "/api/announcement/5" }))
  })

  it("maps access denial without exposing backend details", async () => {
    const request = vi.fn().mockRejectedValue(new HttpClientError("http", "Forbidden", 403))
    const service = new AnnouncementsApiService({ request } as HttpClient)

    await expect(service.getList(context)).rejects.toEqual(
      expect.objectContaining<AnnouncementsServiceError>({ code: "access_denied" }),
    )
  })
})
