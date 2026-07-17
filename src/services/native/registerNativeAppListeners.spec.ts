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

  it("uses router history for the Android back button", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const remove = vi.fn().mockResolvedValue(undefined)
    let listener: ((event: { canGoBack: boolean }) => void) | undefined

    vi.mocked(App.addListener).mockImplementation(async (_event, callback) => {
      listener = callback as (event: { canGoBack: boolean }) => void
      return { remove }
    })

    const router = { back: vi.fn() } as unknown as Router
    const cleanup = await registerNativeAppListeners(router)

    listener?.({ canGoBack: true })

    expect(router.back).toHaveBeenCalledOnce()
    await cleanup()
    expect(remove).toHaveBeenCalledOnce()
  })
})
