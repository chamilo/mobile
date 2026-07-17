import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import AppHeader from "@/components/layout/AppHeader.vue"

describe("AppHeader", () => {
  it("renders the current page title", () => {
    const wrapper = mount(AppHeader, {
      props: {
        title: "My courses",
      },
    })

    expect(wrapper.get("h1").text()).toBe("My courses")
  })
})
