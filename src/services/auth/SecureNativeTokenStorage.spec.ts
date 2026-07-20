import { describe, expect, it } from "vitest"

import type {
  ChamiloSecureStoragePlugin,
  SecureStorageGetOptions,
  SecureStorageGetResult,
  SecureStorageSetOptions,
} from "@/services/auth/ChamiloSecureStoragePlugin"
import { SecureNativeTokenStorage } from "@/services/auth/SecureNativeTokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"

class MemorySecureStoragePlugin implements ChamiloSecureStoragePlugin {
  readonly values = new Map<string, string>()

  async get(options: SecureStorageGetOptions): Promise<SecureStorageGetResult> {
    return {
      value: this.values.get(options.key) ?? null,
    }
  }

  async set(options: SecureStorageSetOptions): Promise<void> {
    this.values.set(options.key, options.value)
  }

  async remove(options: SecureStorageGetOptions): Promise<void> {
    this.values.delete(options.key)
  }
}

describe("SecureNativeTokenStorage", () => {
  it("persists tokens across instances and isolates campuses", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const firstInstance = new SecureNativeTokenStorage(plugin)

    await firstInstance.save("campus-a", {
      token: "token-a",
      expiresAt: 10,
    })
    await firstInstance.save("campus-b", {
      token: "token-b",
      expiresAt: 20,
    })

    const restoredInstance = new SecureNativeTokenStorage(plugin)

    expect(await restoredInstance.load("campus-a")).toEqual({
      token: "token-a",
      expiresAt: 10,
    })
    expect(await restoredInstance.load("campus-b")).toEqual({
      token: "token-b",
      expiresAt: 20,
    })
  })

  it("uses the required campus token namespace", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const storage = new SecureNativeTokenStorage(plugin)

    await storage.save("campus-a", {
      token: "token-a",
      expiresAt: null,
    })

    expect(plugin.values.get("campus-a/token")).toBe(
      JSON.stringify({
        token: "token-a",
        expiresAt: null,
      }),
    )
  })

  it("removes only the selected campus token", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const storage = new SecureNativeTokenStorage(plugin)

    await storage.save("campus-a", {
      token: "token-a",
      expiresAt: null,
    })
    await storage.save("campus-b", {
      token: "token-b",
      expiresAt: null,
    })

    await storage.remove("campus-a")

    expect(await storage.load("campus-a")).toBeNull()
    expect(await storage.load("campus-b")).toEqual({
      token: "token-b",
      expiresAt: null,
    })
  })

  it("removes invalid native data and returns a read error", async () => {
    const plugin = new MemorySecureStoragePlugin()
    plugin.values.set("campus-a/token", '{"token":""}')
    const storage = new SecureNativeTokenStorage(plugin)

    await expect(storage.load("campus-a")).rejects.toMatchObject({
      name: "TokenStorageError",
      kind: "read",
    })
    expect(plugin.values.has("campus-a/token")).toBe(false)
  })

  it("maps native write failures without exposing the token", async () => {
    const plugin = new MemorySecureStoragePlugin()
    plugin.set = async () => {
      throw new Error("Native write failed.")
    }
    const storage = new SecureNativeTokenStorage(plugin)

    const error = await storage
      .save("campus-a", {
        token: "sensitive-token",
        expiresAt: null,
      })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(TokenStorageError)
    expect(error).toMatchObject({
      kind: "write",
      message: "The secure token could not be saved.",
    })
    expect(String(error)).not.toContain("sensitive-token")
  })
})
