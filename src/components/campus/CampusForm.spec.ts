import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import CampusForm from "@/components/campus/CampusForm.vue"
import { i18n } from "@/i18n"

describe("CampusForm", () => {
  it("emits a normalized campus profile", async () => {
    const wrapper = mount(CampusForm, {
      global: { plugins: [i18n] },
    })

    await wrapper.get('input[name="campusName"]').setValue(" Local campus ")
    await wrapper.get('input[name="campusUrl"]').setValue("chamilo2.local/")
    await wrapper.get("form").trigger("submit")

    expect(wrapper.emitted("submit")?.[0]).toEqual([
      {
        displayName: "Local campus",
        baseUrl: "https://chamilo2.local",
        allowInsecureHttp: false,
      },
    ])
  })

  it("shows an accessible validation error", async () => {
    const wrapper = mount(CampusForm, {
      global: { plugins: [i18n] },
    })

    await wrapper.get("form").trigger("submit")

    expect(wrapper.get('[role="alert"]').text()).toContain("Enter a campus name")
  })
})
