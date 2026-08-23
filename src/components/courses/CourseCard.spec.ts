import { mount, RouterLinkStub } from "@vue/test-utils"
import { createPinia } from "pinia"
import { describe, expect, it } from "vitest"

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
  score: 72.5,
  bestScore: 80,
  timeSpentSeconds: 3600,
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
  it("links only the course image and title while keeping progress non-interactive", () => {
    const wrapper = mount(CourseCard, {
      props: {
        enrollment: directEnrollment,
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [createPinia(), i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)

    expect(wrapper.text()).toContain("Mobile course")
    expect(wrapper.text()).toContain("45%")
    expect(wrapper.text()).not.toContain("Open course")
    expect(links).toHaveLength(2)
    expect(
      links.every(
        (link) =>
          JSON.stringify(link.props("to")) ===
          JSON.stringify({
            name: "course-home",
            params: { courseId: "3" },
            query: { source: "direct", membership: "9" },
          }),
      ),
    ).toBe(true)
  })

  it("does not link a course blocked by requirements", () => {
    const wrapper = mount(CourseCard, {
      props: {
        enrollment: { ...directEnrollment, accessAllowed: false, hasRequirements: true },
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [createPinia(), i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })
})
