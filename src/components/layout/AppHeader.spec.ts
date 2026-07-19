import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import AppHeader from "@/components/layout/AppHeader.vue"

describe("AppHeader", () => {
  it("renders the current page title and campus logo", () => {
    const wrapper = mount(AppHeader, {
      props: {
        title: "My courses",
        logoUrl: "https://campus.test/themes/chamilo/logo/header",
        logoAlt: "Campus logo",
      },
    })

    expect(wrapper.get("h1").text()).toBe("My courses")
    expect(wrapper.get("img").attributes()).toMatchObject({
      src: "https://campus.test/themes/chamilo/logo/header",
      alt: "Campus logo",
    })
    expect(wrapper.find('[data-testid="brand-fallback"]').exists()).toBe(false)
  })

  it("shows CH when no campus logo is available", () => {
    const wrapper = mount(AppHeader, {
      props: {
        title: "Sign in",
        logoUrl: null,
        logoAlt: "Campus logo",
      },
    })

    expect(wrapper.get('[data-testid="brand-fallback"]').text()).toBe("CH")
  })

  it("returns to CH when the image cannot be loaded", async () => {
    const wrapper = mount(AppHeader, {
      props: {
        title: "My courses",
        logoUrl: "https://campus.test/broken.svg",
        logoAlt: "Campus logo",
      },
    })

    await wrapper.get("img").trigger("error")

    expect(wrapper.find("img").exists()).toBe(false)
    expect(wrapper.get('[data-testid="brand-fallback"]').text()).toBe("CH")
  })
})
