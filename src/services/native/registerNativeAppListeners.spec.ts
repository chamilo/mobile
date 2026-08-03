import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { describe, expect, it, vi } from "vitest"
import type { Router } from "vue-router"

import { registerNativeAppListeners } from "@/services/native/registerNativeAppListeners"

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>()

  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: vi.fn(),
    },
  }
})

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}))

describe("registerNativeAppListeners", () => {
  it("does not register listeners on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

    await registerNativeAppListeners({} as Router)

    expect(App.addListener).not.toHaveBeenCalled()
  })

  it("uses router history for the Android back button and syncs on resume", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const removeBack = vi.fn().mockResolvedValue(undefined)
    const removeState = vi.fn().mockResolvedValue(undefined)
    let backListener: ((event: { canGoBack: boolean }) => void) | undefined
    let stateListener: ((event: { isActive: boolean }) => void) | undefined

    vi.mocked(App.addListener).mockImplementation(async (event, callback) => {
      if (event === "backButton") {
        backListener = callback as (value: { canGoBack: boolean }) => void
        return { remove: removeBack }
      }

      stateListener = callback as (value: { isActive: boolean }) => void
      return { remove: removeState }
    })

    const router = { back: vi.fn() } as unknown as Router
    const onResume = vi.fn()
    const cleanup = await registerNativeAppListeners(router, onResume)

    backListener?.({ canGoBack: true })
    stateListener?.({ isActive: true })

    expect(router.back).toHaveBeenCalledOnce()
    expect(onResume).toHaveBeenCalledOnce()
    await cleanup()
    expect(removeBack).toHaveBeenCalledOnce()
    expect(removeState).toHaveBeenCalledOnce()
  })
})
