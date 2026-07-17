import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import LoginForm from "@/components/auth/LoginForm.vue"
import { i18n } from "@/i18n"

describe("LoginForm", () => {
  it("requires both credentials", async () => {
    const wrapper = mount(LoginForm, {
      props: { busy: false, errorMessage: null },
      global: { plugins: [i18n] },
    })

    await wrapper.get("form").trigger("submit")

    expect(wrapper.get('[role="alert"]').text()).toContain("Enter your username")
    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("emits credentials and clears the password field", async () => {
    const wrapper = mount(LoginForm, {
      props: { busy: false, errorMessage: null },
      global: { plugins: [i18n] },
    })

    await wrapper.get('input[name="username"]').setValue(" student ")
    await wrapper.get('input[name="password"]').setValue("secret")
    await wrapper.get("form").trigger("submit")

    expect(wrapper.emitted("submit")?.[0]).toEqual([{ username: "student", password: "secret" }])
    expect((wrapper.get('input[name="password"]').element as HTMLInputElement).value).toBe("")
  })
})
