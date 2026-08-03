import { App } from "@capacitor/app"
import { Capacitor, type PluginListenerHandle } from "@capacitor/core"
import type { Router } from "vue-router"

export type NativeAppResumeHandler = () => void | Promise<void>

export async function registerNativeAppListeners(
  router: Router,
  onResume?: NativeAppResumeHandler,
): Promise<() => Promise<void>> {
  if (!Capacitor.isNativePlatform()) {
    return async () => undefined
  }

  const handles: PluginListenerHandle[] = []

  handles.push(
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        router.back()
        return
      }

      void App.exitApp()
    }),
  )

  handles.push(
    await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void onResume?.()
    }),
  )

  return async () => {
    await Promise.all(handles.map((handle) => handle.remove()))
  }
}
