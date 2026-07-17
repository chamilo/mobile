import { describe, expect, it } from "vitest"

import type { AnnouncementListSnapshot } from "@/domain/announcements/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { BrowserAnnouncementsCacheRepository } from "@/services/cache/BrowserAnnouncementsCacheRepository"

const context: CourseNavigationContext = {
  courseId: 12,
  sessionId: null,
  membershipId: 33,
  sessionCourseId: null,
  source: "direct",
}

const snapshot: AnnouncementListSnapshot = {
  context,
  items: [],
  totalItems: 0,
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

describe("BrowserAnnouncementsCacheRepository", () => {
  it("isolates list cache by campus and user", () => {
    const storage = window.localStorage
    storage.clear()
    const repository = new BrowserAnnouncementsCacheRepository(storage)

    repository.saveList("campus-a", 7, context, snapshot)

    expect(repository.loadList("campus-a", 7, context)?.data).toEqual(snapshot)
    expect(repository.loadList("campus-a", 8, context)).toBeNull()
    expect(repository.loadList("campus-b", 7, context)).toBeNull()
  })

  it("removes malformed cache records", () => {
    const storage = window.localStorage
    storage.clear()
    const repository = new BrowserAnnouncementsCacheRepository(storage)

    storage.setItem(
      "chamilo-mobile/campus-a/cache/announcements-user-7-course-12-session-0-source-direct-membership-33-session-course-0-list-v1",
      "{}",
    )

    expect(repository.loadList("campus-a", 7, context)).toBeNull()
    expect(storage.length).toBe(0)
  })
})
