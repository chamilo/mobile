import { mount } from "@vue/test-utils"
import { createPinia } from "pinia"
import PrimeVue from "primevue/config"
import { describe, expect, it } from "vitest"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { createTestRouter } from "@/router"

describe("App", () => {
  it("renders the courses scaffold at the default route", async () => {
    const router = createTestRouter()
    await router.push("/")
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, i18n, PrimeVue],
      },
    })

    expect(wrapper.text()).toContain("Your courses will appear here")
    expect(wrapper.text()).toContain("Courses")
    expect(wrapper.text()).toContain("Profile")
  })
})
