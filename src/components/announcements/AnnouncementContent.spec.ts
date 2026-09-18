// @vitest-environment jsdom

import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import AnnouncementContent from "@/components/announcements/AnnouncementContent.vue"

describe("AnnouncementContent", () => {
  it("reacts to the resolved content locale and renders only that translation", async () => {
    const wrapper = mount(AnnouncementContent, {
      props: {
        html: [
          '<span class="mce-translatehtml" lang="en">Hello</span>',
          '<span class="mce-translatehtml" lang="es">Hola</span>',
        ].join(""),
        campusBaseUrl: "https://campus.example.org",
        locale: "es",
        fallbackLocales: ["en_US"],
      },
    })

    expect(wrapper.text()).toBe("Hola")

    await wrapper.setProps({ locale: "en_US" })

    expect(wrapper.text()).toBe("Hello")
  })
})
