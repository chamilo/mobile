import { describe, expect, it } from "vitest"

import { buildCampusNamespace } from "@/domain/campus/campusNamespace"

describe("buildCampusNamespace", () => {
  it("creates isolated campus resource keys", () => {
    expect(buildCampusNamespace("campus-a", "token")).toBe("campus-a/token")
    expect(buildCampusNamespace("campus-a", "cache", "courses")).toBe("campus-a/cache/courses")
    expect(buildCampusNamespace("campus-b", "cache", "courses")).toBe("campus-b/cache/courses")
  })

  it("rejects invalid campus ids", () => {
    expect(() => buildCampusNamespace("campus/a", "settings")).toThrow()
  })
})
