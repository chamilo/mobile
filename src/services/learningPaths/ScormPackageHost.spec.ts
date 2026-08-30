import { beforeEach, describe, expect, it, vi } from "vitest"

const capacitorState = vi.hoisted(() => ({
  platform: "web",
  nativePluginAvailable: false,
}))

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => capacitorState.platform,
    isNativePlatform: () => capacitorState.platform !== "web",
    isPluginAvailable: (name: string) =>
      name === "ChamiloScormPackage" && capacitorState.nativePluginAvailable,
    convertFileSrc: (value: string) => value,
  },
  registerPlugin: vi.fn(() => ({
    status: vi.fn(),
    resolve: vi.fn(),
    install: vi.fn(),
    removeScope: vi.fn(),
    removeCampus: vi.fn(),
  })),
}))

import { nativeScormPackageHost } from "@/services/learningPaths/NativeScormPackageHost"
import {
  resolveScormPackageHost,
  scormPackageHost,
} from "@/services/learningPaths/ScormPackageHost"
import { webScormPackageHost } from "@/services/learningPaths/WebScormPackageHost"

describe("SCORM package host selection", () => {
  beforeEach(() => {
    capacitorState.platform = "web"
    capacitorState.nativePluginAvailable = false
  })

  it("uses the real web package host for a normal browser", () => {
    expect(resolveScormPackageHost()).toBe(webScormPackageHost)
  })

  it("uses the native host on Android", () => {
    capacitorState.platform = "android"

    expect(resolveScormPackageHost()).toBe(nativeScormPackageHost)
  })

  it("prefers the registered native plugin even if the platform snapshot says web", () => {
    capacitorState.nativePluginAvailable = true

    expect(resolveScormPackageHost()).toBe(nativeScormPackageHost)
  })

  it("uses a larger package limit only for the local web debug host", () => {
    expect(scormPackageHost.maxPackageSizeBytes).toBe(512 * 1024 * 1024)

    capacitorState.platform = "android"

    expect(scormPackageHost.maxPackageSizeBytes).toBe(100 * 1024 * 1024)
  })

  it("delegates at call time instead of freezing the host during module import", async () => {
    const webAssertAvailable = vi
      .spyOn(webScormPackageHost, "assertAvailable")
      .mockResolvedValueOnce()
    const nativeAssertAvailable = vi
      .spyOn(nativeScormPackageHost, "assertAvailable")
      .mockResolvedValueOnce()

    await expect(scormPackageHost.assertAvailable()).resolves.toBeUndefined()
    expect(webAssertAvailable).toHaveBeenCalledTimes(1)
    expect(nativeAssertAvailable).not.toHaveBeenCalled()

    capacitorState.platform = "android"

    await expect(scormPackageHost.assertAvailable()).resolves.toBeUndefined()
    expect(nativeAssertAvailable).toHaveBeenCalledTimes(1)

    webAssertAvailable.mockRestore()
    nativeAssertAvailable.mockRestore()
  })
})
