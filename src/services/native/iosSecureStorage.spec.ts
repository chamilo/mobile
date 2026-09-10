import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("iOS secure storage integration", () => {
  it("wires ChamiloSecureStorage to a Keychain-backed native plugin", () => {
    const plugin = readProjectFile("ios/App/App/ChamiloSecureStoragePlugin.swift")
    const bridgeController = readProjectFile("ios/App/App/ChamiloBridgeViewController.swift")
    const storyboard = readProjectFile("ios/App/App/Base.lproj/Main.storyboard")
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj")

    expect(plugin).toContain('public let jsName = "ChamiloSecureStorage"')
    expect(plugin).toContain("kSecClassGenericPassword")
    expect(plugin).toContain("kSecAttrService")
    expect(plugin).toContain("kSecAttrAccount")
    expect(plugin).toContain("kSecAttrAccessibleWhenUnlockedThisDeviceOnly")
    expect(plugin).not.toContain("UserDefaults")

    expect(bridgeController).toContain(
      "bridge?.registerPluginInstance(ChamiloSecureStoragePlugin())",
    )
    expect(storyboard).toContain('customClass="ChamiloBridgeViewController"')
    expect(project).toContain("ChamiloBridgeViewController.swift in Sources")
    expect(project).toContain("ChamiloSecureStoragePlugin.swift in Sources")
  })
})
