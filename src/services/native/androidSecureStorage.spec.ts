import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Android secure storage integration", () => {
  it("exposes token expiration metadata without returning the JWT before biometric unlock", () => {
    const plugin = readProjectFile(
      "android/app/src/main/java/org/chamilo/mobile/ChamiloSecureStoragePlugin.java",
    )

    expect(plugin).toContain("public void getExpiration(PluginCall call)")
    expect(plugin).toContain('result.put("exists", true)')
    expect(plugin).toContain('result.put("expiresAt"')
    expect(plugin).not.toContain('result.put("token"')
  })
})
