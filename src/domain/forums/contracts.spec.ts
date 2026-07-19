import { describe, expect, it } from "vitest"

import {
  buildForumCategoriesRequest,
  buildForumsRequest,
  buildForumThreadRequest,
  buildForumThreadsRequest,
  normalizeForumCollection,
  normalizeForumThreadDetail,
  normalizeForumThreads,
} from "@/domain/forums/contracts"

const directContext = {
  courseId: 16,
  sessionId: null,
  membershipId: 70,
  sessionCourseId: null,
  source: "direct" as const,
}

const sessionContext = {
  courseId: 16,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("forum contracts", () => {
  it("builds the verified forum list requests", () => {
    expect(buildForumCategoriesRequest(directContext, 99)).toEqual({
      path: "/api/forum_categories",
      query: {
        cid: 16,
        "resourceNode.parent": 99,
        itemsPerPage: 5000,
        "order[iid]": "asc",
      },
    })

    expect(buildForumsRequest(sessionContext, 99)).toEqual({
      path: "/api/forums",
      query: {
        cid: 16,
        "resourceNode.parent": 99,
        sid: 4,
        itemsPerPage: 5000,
        "order[iid]": "asc",
      },
    })
  })

  it("builds the verified thread and post requests", () => {
    expect(buildForumThreadsRequest(sessionContext, 8)).toEqual({
      path: "/api/forum_threads",
      query: {
        forum: "/api/forums/8",
        cid: 16,
        sid: 4,
        itemsPerPage: 5000,
        "order[threadSticky]": "desc",
        "order[threadDate]": "desc",
        "order[iid]": "desc",
      },
    })

    expect(buildForumThreadRequest(sessionContext, 8, 12)).toEqual({
      path: "/api/forum_threads/12/posts",
      query: {
        cid: 16,
        forumId: 8,
        sid: 4,
      },
    })
  })

  it("groups forums with their verified categories", () => {
    const result = normalizeForumCollection(
      {
        "hydra:member": [
          {
            iid: 3,
            title: "General",
            catComment: "<p>General discussion</p>",
            locked: 0,
            forumCategoryVisible: true,
            position: 1,
          },
        ],
      },
      {
        "hydra:member": [
          {
            iid: 8,
            title: "Questions",
            forumComment: "<p>Ask the class</p>",
            forumCategory: "/api/forum_categories/3",
            forumThreads: ["/api/forum_threads/1"],
            forumPosts: ["/api/forum_posts/1", "/api/forum_posts/2"],
            locked: 0,
            forumVisible: true,
            availabilityStatus: "open",
            forumOfGroup: 0,
            moderated: true,
            allowNewThreads: true,
            subscribed: false,
            canSubscribe: true,
          },
          {
            iid: 9,
            title: "Open forum",
            forumComment: "",
            forumCategory: null,
            forumThreads: [],
            forumPosts: [],
            locked: 1,
            forumVisible: true,
            availabilityStatus: "closed",
            forumOfGroup: 0,
            moderated: false,
            allowNewThreads: false,
            subscribed: true,
            canSubscribe: true,
          },
        ],
      },
    )

    expect(result.totalItems).toBe(2)
    expect(result.categories[0]?.category).toMatchObject({
      id: 3,
      title: "General",
      description: "General discussion",
    })
    expect(result.categories[0]?.forums[0]).toMatchObject({
      id: 8,
      title: "Questions",
      description: "Ask the class",
      threadCount: 1,
      postCount: 2,
      categoryTitle: "General",
      availabilityStatus: "open",
    })
    expect(result.uncategorized[0]).toMatchObject({
      id: 9,
      locked: true,
      availabilityStatus: "closed",
    })
  })

  it("normalizes the verified forum discussions response", () => {
    const result = normalizeForumThreads(
      {
        "hydra:member": [
          {
            iid: 12,
            title: "Welcome",
            locked: 0,
            threadVisible: true,
            threadSticky: 1,
            threadReplies: 3,
            threadViews: 9,
            threadDateIso: "2026-07-19T01:00:00+00:00",
            threadRelativeTime: "1 hour ago",
            posterFullName: "Aldo Calabaza",
            posterRoleLabel: "Student",
            lastPostTitle: "Re: Welcome",
            lastPostRelativeTime: "10 minutes ago",
            lastPosterFullName: "Teacher One",
            subscribed: true,
            canSubscribe: true,
            gradebookEnabled: false,
            lockedByGradebook: false,
          },
        ],
        "hydra:totalItems": 1,
      },
      8,
    )

    expect(result).toMatchObject({
      forumId: 8,
      forumTitle: "",
      totalItems: 1,
    })
    expect(result.items[0]).toMatchObject({
      id: 12,
      title: "Welcome",
      sticky: true,
      replyCount: 3,
      viewCount: 9,
    })
  })

  it("normalizes read-only posts without rendering backend HTML", () => {
    const result = normalizeForumThreadDetail(
      {
        forum: {
          iid: 8,
          title: "Questions",
          locked: 0,
          availabilityStatus: "open",
        },
        thread: {
          iid: 12,
          title: "Welcome",
          locked: 0,
          threadSticky: true,
          posterFullName: "Aldo Calabaza",
          posterRoleLabel: "Student",
          threadDateIso: "2026-07-19T01:00:00+00:00",
          threadRelativeTime: "1 hour ago",
        },
        canReply: true,
        posts: [
          {
            iid: 30,
            title: "First post",
            postText: "<p>Hello <strong>class</strong></p>",
            postDateIso: "2026-07-19T01:00:00+00:00",
            postRelativeTime: "1 hour ago",
            postParentId: null,
            visible: true,
            statusLabel: "Validated",
            posterFullName: "Aldo Calabaza",
            posterRoleLabel: "Student",
            attachments: [
              {
                iid: 4,
                filename: "notes.pdf",
                size: 123,
                downloadUrl: "/resource/file/4",
              },
            ],
          },
        ],
      },
      8,
      12,
    )

    expect(result).toMatchObject({
      forumId: 8,
      threadId: 12,
      threadTitle: "Welcome",
      canReply: true,
    })
    expect(result.posts[0]).toMatchObject({
      id: 30,
      text: "Hello class",
      posterFullName: "Aldo Calabaza",
    })
    expect(result.posts[0]?.attachments[0]).toMatchObject({
      id: 4,
      filename: "notes.pdf",
    })
  })
})
