import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("iOS push integration", () => {
  it("wires Capacitor PushNotifications to APNs without persisting the device token", () => {
    const config = readProjectFile("capacitor.config.ts")
    const appDelegate = readProjectFile("ios/App/App/AppDelegate.swift")
    const entitlements = readProjectFile("ios/App/App/App.entitlements")
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj")
    const gateway = readProjectFile(
      "src/services/pushNotifications/NativePushNotificationGateway.ts",
    )
    const apiService = readProjectFile(
      "src/services/pushNotifications/MobilePushInstallationApiService.ts",
    )

    expect(config).toContain('iosPlugins.push("@capacitor/push-notifications")')
    expect(appDelegate).toContain("capacitorDidRegisterForRemoteNotifications")
    expect(appDelegate).toContain("capacitorDidFailToRegisterForRemoteNotifications")
    expect(entitlements).toContain("aps-environment")
    expect(project).toContain("CODE_SIGN_ENTITLEMENTS = App/App.entitlements")
    expect(project).toContain("com.apple.Push")
    expect(gateway).toContain('platform === "android" || platform === "ios"')
    expect(apiService).toContain('export type MobilePushPlatform = "android" | "ios"')
    expect(apiService).not.toContain("localStorage")
  })
})
