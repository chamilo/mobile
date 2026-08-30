import { describe, expect, it } from "vitest"

import { shouldReuseScormPackageCache } from "@/domain/learningPaths/scormPackageCachePolicy"

describe("SCORM package cache policy", () => {
  it("reuses immutable SCORM package caches", () => {
    expect(
      shouldReuseScormPackageCache({
        isCStudioContent: false,
        offline: false,
        campusAvailable: true,
      }),
    ).toBe(true)
  })

  it("refreshes mutable CStudio packages while online", () => {
    expect(
      shouldReuseScormPackageCache({
        isCStudioContent: true,
        offline: false,
        campusAvailable: true,
      }),
    ).toBe(false)
  })

  it("keeps the last CStudio package available offline", () => {
    expect(
      shouldReuseScormPackageCache({
        isCStudioContent: true,
        offline: true,
        campusAvailable: false,
      }),
    ).toBe(true)
  })
})
