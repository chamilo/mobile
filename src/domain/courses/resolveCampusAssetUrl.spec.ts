import { describe, expect, it } from "vitest"

import { resolveCampusAssetUrl } from "@/domain/courses/resolveCampusAssetUrl"

describe("resolveCampusAssetUrl", () => {
  it("resolves relative campus assets", () => {
    expect(resolveCampusAssetUrl("/uploads/course.png", "https://campus.example.org")).toBe(
      "https://campus.example.org/uploads/course.png",
    )
  })

  it("rejects unsafe protocols and embedded credentials", () => {
    expect(resolveCampusAssetUrl("javascript:alert(1)", "https://campus.example.org")).toBeNull()
    expect(
      resolveCampusAssetUrl("https://user:pass@example.org/a.png", "https://x.test"),
    ).toBeNull()
  })
})
