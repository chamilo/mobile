import { beforeEach, describe, expect, it } from "vitest"

import type { CoursesOverview } from "@/domain/courses/types"
import { BrowserCampusCacheRepository } from "@/services/cache/BrowserCampusCacheRepository"

const overview: CoursesOverview = {
  directCourses: [],
  currentSessions: [],
  upcomingSessions: [],
  pastSessions: [],
  fetchedAt: "2026-07-17T00:00:00.000Z",
}

describe("BrowserCampusCacheRepository", () => {
  beforeEach(() => window.localStorage.clear())

  it("stores course data in a campus namespace", () => {
    const repository = new BrowserCampusCacheRepository(window.localStorage)

    repository.saveCourses("campus-a", 7, overview)

    expect(repository.loadCourses("campus-a", 7)?.data).toEqual(overview)
    expect(repository.loadCourses("campus-b", 7)).toBeNull()
  })

  it("isolates cached courses by user within the same campus", () => {
    const repository = new BrowserCampusCacheRepository(window.localStorage)

    repository.saveCourses("campus-a", 7, overview)

    expect(repository.loadCourses("campus-a", 7)?.data).toEqual(overview)
    expect(repository.loadCourses("campus-a", 8)).toBeNull()
  })

  it("clears only the selected campus cache", () => {
    const repository = new BrowserCampusCacheRepository(window.localStorage)

    repository.saveCourses("campus-a", 7, overview)
    repository.saveCourses("campus-b", 7, overview)
    repository.clearCampus("campus-a")

    expect(repository.loadCourses("campus-a", 7)).toBeNull()
    expect(repository.loadCourses("campus-b", 7)?.data).toEqual(overview)
  })
})
