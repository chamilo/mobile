import { describe, expect, it } from "vitest"

import { createTestRouter } from "@/router"

describe("mobile router", () => {
  it("redirects the root route to campus setup", async () => {
    const router = createTestRouter()

    await router.push("/")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("campuses")
  })

  it("keeps course and enrollment context in local mobile routes", async () => {
    const router = createTestRouter()

    await router.push({
      name: "announcements",
      params: { courseId: "42" },
      query: { source: "session", sid: "8", sessionCourse: "17" },
    })
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("announcements")
    expect(router.currentRoute.value.params.courseId).toBe("42")
    expect(router.currentRoute.value.query).toEqual({
      source: "session",
      sid: "8",
      sessionCourse: "17",
    })
  })

  it("keeps context when opening an announcement detail", async () => {
    const router = createTestRouter()

    await router.push({
      name: "announcement-detail",
      params: { courseId: "42", announcementId: "9" },
      query: { source: "direct", membership: "17" },
    })
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("announcement-detail")
    expect(router.currentRoute.value.params).toEqual({ courseId: "42", announcementId: "9" })
    expect(router.currentRoute.value.query).toEqual({ source: "direct", membership: "17" })
  })
})
