import { mount } from "@vue/test-utils"
import { createPinia } from "pinia"
import PrimeVue from "primevue/config"
import { beforeEach, describe, expect, it } from "vitest"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { createTestRouter } from "@/router"

beforeEach(() => {
  window.localStorage.clear()
})

describe("App", () => {
  it("renders campus setup at the default route", async () => {
    const router = createTestRouter()
    await router.push("/")
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, i18n, PrimeVue],
      },
    })

    expect(wrapper.text()).toContain("Connect to a campus")
    expect(wrapper.text()).toContain("Add a campus")
    expect(wrapper.text()).toContain("No campuses saved")
  })
})
