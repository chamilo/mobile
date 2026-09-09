import { describe, expect, it } from "vitest"

import config from "../../../capacitor.config"

describe("foreground push presentation", () => {
  it("uses the native system notification presentation while the app is foregrounded", () => {
    expect(config.plugins?.PushNotifications?.presentationOptions).toEqual(["sound", "alert"])
  })
})
