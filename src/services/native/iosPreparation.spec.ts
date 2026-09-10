import { describe, expect, it } from "vitest"

import config from "../../../capacitor.config"

describe("iOS platform preparation", () => {
  it("keeps optional push support disabled when push build flags are not enabled", () => {
    expect(config.ios?.includePlugins).toEqual(["@capacitor/app"])
    expect(config.ios?.includePlugins).not.toContain("@capacitor/push-notifications")
  })
})
