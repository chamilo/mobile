import { describe, expect, it } from "vitest"

import config from "../../../capacitor.config"

describe("iOS platform preparation", () => {
  it("includes only the native App plugin until iOS-specific capabilities are validated", () => {
    expect(config.ios?.includePlugins).toEqual(["@capacitor/app"])
    expect(config.ios?.includePlugins).not.toContain("@capacitor/push-notifications")
  })
})
