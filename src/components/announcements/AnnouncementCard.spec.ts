import { describe, expect, it } from "vitest"
import { mount } from "@vue/test-utils"

import AnnouncementCard from "@/components/announcements/AnnouncementCard.vue"
import { i18n } from "@/i18n"

const RouterLinkStub = {
  props: ["to"],
  template: '<a href="#"><slot /></a>',
}

describe("AnnouncementCard", () => {
  it("shows the title, author and attachment count", () => {
    const wrapper = mount(AnnouncementCard, {
      props: {
        announcement: {
          id: 5,
          title: "Welcome",
          author: { id: 7, username: "teacher", fullName: "Course Teacher" },
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: null,
          emailSent: false,
          hasAttachments: true,
          attachmentCount: 2,
          displayOrder: 1,
        },
        to: { name: "announcement-detail" },
      },
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain("Welcome")
    expect(wrapper.text()).toContain("Course Teacher")
    expect(wrapper.text()).toContain("2 attachments")
  })
})
