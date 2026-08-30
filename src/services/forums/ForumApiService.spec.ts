import { describe, expect, it, vi } from "vitest"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ForumLearningPathContext } from "@/domain/forums/learningPathContext"
import { ForumApiService } from "@/services/forums/ForumApiService"
import type { HttpClient } from "@/services/http/HttpClient"

const context: CourseNavigationContext = {
  courseId: 16,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session",
}

const learningPathContext: ForumLearningPathContext = {
  origin: "learnpath",
  entry: "forum",
  learningPathId: 7,
  learningPathItemId: 12,
  learningPathTitle: "LP one",
  groupId: 3,
}

function service(): ForumApiService {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    headers: {},
    data: { token: "forum-token" },
  })

  return new ForumApiService({ request } as unknown as HttpClient)
}

describe("ForumApiService learning path writes", () => {
  it("preserves group context when preparing a thread create request", async () => {
    const request = await service().prepareCreateThreadRequest(
      context,
      8,
      { title: "Question", text: "Hello", postNotification: false },
      learningPathContext,
    )

    expect(request.query).toEqual({ cid: 16, sid: 4, gid: 3 })
  })

  it("preserves group context when preparing a reply request", async () => {
    const request = await service().prepareCreateReplyRequest(
      context,
      8,
      15,
      { title: "Re: Question", text: "Reply", postNotification: false },
      { ...learningPathContext, entry: "thread" },
    )

    expect(request.query).toEqual({ cid: 16, sid: 4, gid: 3 })
  })
  it("accepts the current Chamilo reply response contract", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: { token: "forum-token" },
      })
      .mockResolvedValueOnce({
        status: 201,
        headers: { "content-type": "application/json" },
        data: {
          postId: 44,
          threadId: 15,
          attachments: [],
          requiresApproval: false,
          message: "Reply added.",
        },
      })

    const api = new ForumApiService({ request } as unknown as HttpClient)
    const result = await api.createReply(context, 8, 15, {
      title: "Re: Question",
      text: "Reply",
      postNotification: true,
    })

    expect(result).toEqual({
      postId: 44,
      threadId: 15,
      requiresApproval: false,
      message: "Reply added.",
    })
    expect(request).toHaveBeenCalledTimes(2)
  })
})
