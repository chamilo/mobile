import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("iOS SCORM integration", () => {
  it("wires the existing ChamiloScormPackage contract to a guarded iOS package cache", () => {
    const plugin = readProjectFile("ios/App/App/ChamiloScormPackagePlugin.swift")
    const resolver = readProjectFile("ios/App/App/ScormPackageFileResolver.swift")
    const bridge = readProjectFile("ios/App/App/ChamiloBridgeViewController.swift")
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj")
    const host = readProjectFile("src/services/learningPaths/ScormPackageHost.ts")
    const nativeHost = readProjectFile(
      "src/services/learningPaths/NativeScormPackageHost.ts",
    )
    const offlineManager = readProjectFile(
      "src/services/offline/OfflineCoursePackManager.ts",
    )

    expect(plugin).toContain("import ZIPFoundation")
    expect(plugin).toContain('public let jsName = "ChamiloScormPackage"')
    expect(plugin).toContain("private static let maxEntries = 20_000")
    expect(plugin).toContain("private static let maxCompressedSize = 100 * 1024 * 1024")
    expect(plugin).toContain("private static let maxUncompressedSize: UInt64 = 1024 * 1024 * 1024")
    expect(plugin).toContain("allowUncontainedSymlinks: false")
    expect(plugin).toContain("skipCRC32: false")
    expect(plugin).toContain("entry.type == .symlink")
    expect(plugin).toContain("resourceValues.isExcludedFromBackup = true")
    expect(plugin).not.toContain("UserDefaults")
    expect(plugin).not.toContain("localStorage")

    expect(resolver).toContain('segment == ".."')
    expect(resolver).toContain("ambiguousLaunchPath")
    expect(resolver).toContain("escapedCacheDirectory")

    expect(bridge).toContain(
      "bridge?.registerPluginInstance(ChamiloScormPackagePlugin())",
    )

    expect(project).toContain("ChamiloScormPackagePlugin.swift in Sources")
    expect(project).toContain("ScormPackageFileResolver.swift in Sources")
    expect(project).toContain('repositoryURL = "https://github.com/weichsel/ZIPFoundation.git"')
    expect(project).toContain("kind = exactVersion")
    expect(project).toContain("version = 0.9.20")

    expect(host).toContain('Capacitor.getPlatform() === "ios"')
    expect(nativeHost).toContain('Capacitor.getPlatform() === "ios"')
    expect(offlineManager).toContain('Capacitor.getPlatform() === "ios"')
    expect(offlineManager).toContain('code: "scorm_native_only"')
  })
})
