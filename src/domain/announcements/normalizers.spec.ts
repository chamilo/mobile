import { describe, expect, it } from "vitest"

import {
  AnnouncementContractError,
  normalizeAnnouncementDetailResponse,
  normalizeAnnouncementListResponse,
} from "@/domain/announcements/normalizers"
import type { CourseNavigationContext } from "@/domain/courses/types"

const directContext: CourseNavigationContext = {
  courseId: 12,
  sessionId: null,
  membershipId: 33,
  sessionCourseId: null,
  source: "direct",
}

const sessionContext: CourseNavigationContext = {
  courseId: 12,
  sessionId: 8,
  membershipId: null,
  sessionCourseId: 44,
  source: "session",
}

const summary = {
  id: 5,
  title: "Welcome",
  author: { id: 7, username: "teacher", fullName: "Course Teacher" },
  createdAt: "2026-07-17T00:00:00+00:00",
  updatedAt: "2026-07-17T01:00:00+00:00",
  emailSent: true,
  hasAttachments: true,
  attachmentCount: 1,
  visibility: 2,
  displayOrder: 1,
}

describe("announcement normalizers", () => {
  it("normalizes a verified direct-course list", () => {
    const result = normalizeAnnouncementListResponse(
      {
        courseId: 12,
        sessionId: null,
        groupId: null,
        totalItems: 1,
        items: [summary],
      },
      directContext,
    )

    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 5, title: "Welcome", attachmentCount: 1 }),
    )
    expect(result.context).toEqual(directContext)
  })

  it("normalizes a session announcement detail and attachments", () => {
    const result = normalizeAnnouncementDetailResponse(
      {
        id: 5,
        courseId: 12,
        sessionId: 8,
        groupId: null,
        item: {
          ...summary,
          content: "<p>Hello</p>",
          language: "en",
          attachments: [
            {
              id: 9,
              filename: "guide.pdf",
              comment: "Read this file",
              size: 2048,
              downloadUrl: "/api/announcement/5/attachment/9/download?cid=12&sid=8",
            },
          ],
        },
      },
      sessionContext,
      5,
    )

    expect(result.item.contentHtml).toBe("<p>Hello</p>")
    expect(result.item.attachments[0]).toEqual(
      expect.objectContaining({ id: 9, filename: "guide.pdf", size: 2048 }),
    )
  })

  it("rejects a response from another session", () => {
    expect(() =>
      normalizeAnnouncementListResponse(
        {
          courseId: 12,
          sessionId: 99,
          groupId: null,
          totalItems: 0,
          items: [],
        },
        sessionContext,
      ),
    ).toThrow(AnnouncementContractError)
  })

  it("rejects unsafe attachment URLs", () => {
    expect(() =>
      normalizeAnnouncementDetailResponse(
        {
          id: 5,
          courseId: 12,
          sessionId: null,
          groupId: null,
          item: {
            ...summary,
            content: "",
            attachments: [
              {
                id: 9,
                filename: "guide.pdf",
                size: 10,
                downloadUrl: "https://other.example.org/file.pdf",
              },
            ],
          },
        },
        directContext,
        5,
      ),
    ).toThrow(AnnouncementContractError)
  })
})
