import { mount, RouterLinkStub } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import ToolCard from "@/components/courseHome/ToolCard.vue"
import { i18n } from "@/i18n"

const capability = {
  toolKey: "announcements" as const,
  titleKey: "courseHome.tools.announcements.title",
  descriptionKey: "courseHome.tools.announcements.description",
  icon: "pi pi-megaphone",
  available: true,
  readOnly: true,
  reason: null,
  route: {
    name: "announcements",
    params: { courseId: "4" },
    query: { source: "direct", membership: "9" },
  },
  apiContract: {
    list: "GET /api/announcement/list",
    detail: "GET /api/announcement/{id}",
    context: ["cid", "sid", "gid"],
  },
}

describe("ToolCard", () => {
  it("renders a verified read-only capability", () => {
    const wrapper = mount(ToolCard, {
      props: { capability },
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain("Announcements")
    expect(wrapper.text()).toContain("Read only")
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual(capability.route)
  })
})
