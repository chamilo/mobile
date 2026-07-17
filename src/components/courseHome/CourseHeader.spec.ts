import { mount, RouterLinkStub } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import CourseHeader from "@/components/courseHome/CourseHeader.vue"
import { i18n } from "@/i18n"

const entry = {
  course: {
    id: 4,
    iri: "/api/courses/4",
    title: "Mobile course home",
    code: "MOBILE",
    language: "english",
    description: null,
    illustrationUrl: null,
  },
  context: {
    courseId: 4,
    sessionId: 8,
    membershipId: null,
    sessionCourseId: 17,
    source: "session" as const,
  },
  role: "student" as const,
  progress: 55,
  sessionTitle: "July session",
  sessionPeriod: "current" as const,
  accessState: "available" as const,
}

describe("CourseHeader", () => {
  it("renders course, session and progress context", () => {
    const wrapper = mount(CourseHeader, {
      props: {
        entry,
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain("Mobile course home")
    expect(wrapper.text()).toContain("July session")
    expect(wrapper.text()).toContain("55%")
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({ name: "courses" })
  })
})
