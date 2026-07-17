import { describe, expect, it, vi } from "vitest"

import { CoursesApiService, CoursesServiceError } from "@/services/courses/CoursesApiService"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

function collection(items: unknown[], next?: string) {
  return {
    "@type": "hydra:Collection",
    "hydra:member": items,
    ...(next ? { "hydra:view": { "hydra:next": next } } : {}),
  }
}

const directCourse = {
  "@id": "/api/course_rel_users/1",
  status: 5,
  course: { "@id": "/api/courses/2", id: 2, title: "Direct course" },
}

const session = {
  "@id": "/api/sessions/3",
  id: 3,
  title: "Session",
  courses: [
    {
      "@id": "/api/session_rel_courses/4",
      course: { "@id": "/api/courses/5", id: 5, title: "Session course" },
    },
  ],
}

describe("CoursesApiService", () => {
  it("loads all verified course and session contracts", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: collection([], "/api/me/courses?page=2&itemsPerPage=50"),
      })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: collection([session]) })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: collection([]) })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: collection([]) })
      .mockResolvedValueOnce({ status: 200, headers: {}, data: collection([directCourse]) })
    const service = new CoursesApiService({ request } as HttpClient)

    const overview = await service.getOverview(7)

    expect(overview.directCourses).toHaveLength(1)
    expect(overview.currentSessions[0]?.courses[0]?.context.sessionId).toBe(3)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/users/7/session_subscriptions/current?itemsPerPage=50",
      }),
    )
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/me/courses?page=2&itemsPerPage=50" }),
    )
  })

  it("maps an expired JWT to a session error", async () => {
    const request = vi.fn().mockRejectedValue(new HttpClientError("http", "Unauthorized", 401))
    const service = new CoursesApiService({ request } as HttpClient)

    await expect(service.getOverview(7)).rejects.toEqual(
      expect.objectContaining<CoursesServiceError>({ code: "session_expired" }),
    )
  })

  it("rejects unsafe Hydra pagination links", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: collection([], "https://other.example.org/api/courses?page=2"),
    })
    const service = new CoursesApiService({ request } as HttpClient)

    await expect(service.getOverview(7)).rejects.toEqual(
      expect.objectContaining<CoursesServiceError>({ code: "invalid_response" }),
    )
  })
})
