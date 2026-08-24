import { flushPromises, mount } from "@vue/test-utils"
import { createMemoryHistory, createRouter } from "vue-router"
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
  it("renders context and returns to courses", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/course",
          name: "course",
          component: { template: "<div />" },
        },
        {
          path: "/courses",
          name: "courses",
          component: { template: "<div />" },
        },
      ],
    })

    await router.push({ name: "course" })
    await router.isReady()

    const wrapper = mount(CourseHeader, {
      props: {
        entry,
        campusBaseUrl: "https://campus.example.org",
      },
      global: {
        plugins: [i18n, router],
      },
    })

    expect(wrapper.text()).not.toContain("Mobile course home")
    expect(wrapper.text()).toContain("Course home")
    expect(wrapper.text()).toContain("July session")
    expect(wrapper.text()).toContain("55%")
    expect(wrapper.text()).not.toContain("Progress")

    const progressbar = wrapper.get('[role="progressbar"]')
    expect(progressbar.attributes("aria-valuenow")).toBe("55")
    expect(progressbar.element.previousElementSibling?.tagName).toBe("NAV")

    await wrapper.get("nav button").trigger("click")
    await flushPromises()

    expect(router.currentRoute.value.name).toBe("courses")
  })
})
