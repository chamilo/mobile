import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("iOS document integration", () => {
  it("wires the existing ChamiloDocument contract to native iOS preview and export", () => {
    const plugin = readProjectFile("ios/App/App/ChamiloDocumentPlugin.swift")
    const bridgeController = readProjectFile("ios/App/App/ChamiloBridgeViewController.swift")
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj")
    const presenter = readProjectFile("src/services/documents/DocumentBlobPresenter.ts")

    expect(plugin).toContain("import QuickLook")
    expect(plugin).toContain('public let jsName = "ChamiloDocument"')
    expect(plugin).toContain("QLPreviewController")
    expect(plugin).toContain("UIDocumentPickerViewController")
    expect(plugin).toContain("forExporting: [fileURL]")
    expect(plugin).toContain('call.resolve(["saved": saved])')
    expect(plugin).not.toContain("UserDefaults")
    expect(plugin).not.toContain("localStorage")

    expect(bridgeController).toContain(
      "bridge?.registerPluginInstance(ChamiloDocumentPlugin())",
    )
    expect(project).toContain("ChamiloDocumentPlugin.swift in Sources")
    expect(presenter).toContain("Capacitor.isNativePlatform()")
  })
})
