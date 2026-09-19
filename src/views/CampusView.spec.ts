import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n } from "@/i18n"
import { useCampusStore } from "@/stores/campus"
import CampusView from "@/views/CampusView.vue"

describe("CampusView", () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it("shows saved campuses before the add-campus form", () => {
    const campusStore = useCampusStore()
    campusStore.initialize()
    campusStore.addCampus({ displayName: "Campus A", baseUrl: "campus-a.example.org" })

    const wrapper = mount(CampusView, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: {
            template: '<a data-test="continue-link"><slot /></a>',
          },
        },
      },
    })
    const html = wrapper.html()

    expect(html.indexOf('id="saved-campuses-title"')).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('name="campusName"')).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('id="saved-campuses-title"')).toBeLessThan(
      html.indexOf('name="campusName"'),
    )
  })
})
