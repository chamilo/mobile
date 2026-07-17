import { describe, expect, it } from "vitest"
import { mount, RouterLinkStub } from "@vue/test-utils"

import CourseCard from "@/components/courses/CourseCard.vue"
import { i18n } from "@/i18n"

const directEnrollment = {
  key: "direct:9",
  source: "direct" as const,
  membershipId: 9,
  membershipIri: "/api/course_rel_users/9",
  course: {
    id: 3,
    iri: "/api/courses/3",
    title: "Mobile course",
    code: "MOBILE",
    language: "english",
    description: null,
    illustrationUrl: "/uploads/course.png",
  },
  role: "student" as const,
  progress: 45,
  completed: false,
  certificateAvailable: false,
  hasNewContent: true,
  hasRequirements: false,
  accessAllowed: true,
  teachers: [],
  context: {
    courseId: 3,
    sessionId: null,
    membershipId: 9,
    sessionCourseId: null,
    source: "direct" as const,
  },
}

describe("CourseCard", () => {
  it("renders course progress and preserves the direct membership route", () => {
    const wrapper = mount(CourseCard, {
      props: {
        enrollment: directEnrollment,
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain("Mobile course")
    expect(wrapper.text()).toContain("45%")
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
      name: "course-home",
      params: { courseId: "3" },
      query: { source: "direct", membership: "9" },
    })
  })

  it("does not link a course blocked by requirements", () => {
    const wrapper = mount(CourseCard, {
      props: {
        enrollment: { ...directEnrollment, accessAllowed: false, hasRequirements: true },
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(wrapper.get("button").attributes("disabled")).toBeDefined()
  })
})
