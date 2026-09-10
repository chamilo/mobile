import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("iOS biometric integration", () => {
  it("wires the existing ChamiloBiometric contract to LocalAuthentication", () => {
    const plugin = readProjectFile("ios/App/App/ChamiloBiometricPlugin.swift")
    const bridgeController = readProjectFile("ios/App/App/ChamiloBridgeViewController.swift")
    const infoPlist = readProjectFile("ios/App/App/Info.plist")
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj")
    const gateway = readProjectFile("src/services/biometrics/NativeBiometricGateway.ts")
    const tokenStorage = readProjectFile("src/services/auth/createTokenStorage.ts")

    expect(plugin).toContain("import LocalAuthentication")
    expect(plugin).toContain('public let jsName = "ChamiloBiometric"')
    expect(plugin).toContain("deviceOwnerAuthenticationWithBiometrics")
    expect(plugin).toContain("canEvaluatePolicy")
    expect(plugin).toContain("evaluatePolicy")
    expect(plugin).toContain(".biometryNotEnrolled")
    expect(plugin).toContain(".biometryLockout")
    expect(plugin).toContain(".userCancel")

    expect(bridgeController).toContain(
      "bridge?.registerPluginInstance(ChamiloBiometricPlugin())",
    )
    expect(infoPlist).toContain("NSFaceIDUsageDescription")
    expect(project).toContain("ChamiloBiometricPlugin.swift in Sources")

    expect(gateway).toContain('platform === "android" || platform === "ios"')
    expect(tokenStorage).toContain('platform === "android" || platform === "ios"')
  })
})
