import { describe, expect, it } from "vitest"

import { WebScormFixtureHost, resolveScormWebFixture } from "@/services/learningPaths/WebScormFixtureHost"

describe("resolveScormWebFixture", () => {
  it("resolves the supplied SCORM 1.2 package and strips backend path prefixes", () => {
    const fixture = resolveScormWebFixture(
      "554cefe15f8a453c390cb3fdd9bd234dce74f65ba4b7b75569d5d36ce9d74da6",
      "course/package/sco1.html",
    )

    expect(fixture).toEqual(
      expect.objectContaining({
        fixtureId: "scorm12",
        entryPath: "sco1.html",
        url: "/__scorm-fixtures/scorm12/sco1.html",
      }),
    )
  })

  it("resolves the supplied SCORM 2004 package entry", () => {
    const fixture = resolveScormWebFixture(
      "43c9018f240141848439d9463fa1011e97b9f6625f55b5f84814c43e07277d5f",
      "package-root/sco/assessment.html",
    )

    expect(fixture).toEqual(
      expect.objectContaining({
        fixtureId: "scorm2004",
        entryPath: "sco/assessment.html",
        url: "/__scorm-fixtures/scorm2004/sco/assessment.html",
      }),
    )
  })

  it("rejects unknown packages and unsafe paths", () => {
    expect(resolveScormWebFixture("0".repeat(64), "sco1.html")).toBeNull()
    expect(
      resolveScormWebFixture(
        "554cefe15f8a453c390cb3fdd9bd234dce74f65ba4b7b75569d5d36ce9d74da6",
        "../sco1.html",
      ),
    ).toBeNull()
  })

  it("reports real downloaded packages as unsupported by the local web fixture host", async () => {
    const host = new WebScormFixtureHost()
    const archive = new TextEncoder().encode("not-a-known-scorm-fixture").buffer

    await expect(host.install("scope", "fingerprint", "index.html", archive)).rejects.toMatchObject({
      code: "web_package_unsupported",
    })
  })
})
