import { describe, expect, it } from "vitest"

import { createTestRouter } from "@/router"

describe("mobile router", () => {
  it("redirects the root route to campus setup", async () => {
    const router = createTestRouter()

    await router.push("/")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("campuses")
  })

  it("keeps course ids in local mobile routes", async () => {
    const router = createTestRouter()

    await router.push("/courses/42/announcements")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("announcements")
    expect(router.currentRoute.value.params.courseId).toBe("42")
  })
})
