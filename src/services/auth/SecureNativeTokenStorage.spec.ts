import { describe, expect, it } from "vitest"

import type {
  ChamiloSecureStoragePlugin,
  SecureStorageExpirationResult,
  SecureStorageGetOptions,
  SecureStorageGetResult,
  SecureStorageSetOptions,
} from "@/services/auth/ChamiloSecureStoragePlugin"
import { SecureNativeTokenStorage } from "@/services/auth/SecureNativeTokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"

class MemorySecureStoragePlugin implements ChamiloSecureStoragePlugin {
  readonly values = new Map<string, string>()
  getCalls = 0
  getExpirationCalls = 0

  async get(options: SecureStorageGetOptions): Promise<SecureStorageGetResult> {
    this.getCalls += 1
    return {
      value: this.values.get(options.key) ?? null,
    }
  }

  async getExpiration(options: SecureStorageGetOptions): Promise<SecureStorageExpirationResult> {
    this.getExpirationCalls += 1
    const serialized = this.values.get(options.key)

    if (!serialized) {
      return { exists: false, expiresAt: null }
    }

    const parsed = JSON.parse(serialized) as { token?: unknown; expiresAt?: unknown }
    const expiresAt = parsed.expiresAt

    if (
      typeof parsed.token !== "string" ||
      parsed.token.length === 0 ||
      !(expiresAt === null || (typeof expiresAt === "number" && Number.isFinite(expiresAt)))
    ) {
      throw new Error("Secure storage value is invalid.")
    }

    return {
      exists: true,
      expiresAt,
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

  it("reads expiration metadata without requesting the JWT value", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const storage = new SecureNativeTokenStorage(plugin)
    await storage.save("campus-a", {
      token: "sensitive-token",
      expiresAt: 2_000_000_000_000,
    })

    await expect(storage.loadExpiration("campus-a")).resolves.toEqual({
      exists: true,
      expiresAt: 2_000_000_000_000,
    })
    expect(plugin.getExpirationCalls).toBe(1)
    expect(plugin.getCalls).toBe(0)
  })

  it("reports missing expiration metadata without requesting the JWT value", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const storage = new SecureNativeTokenStorage(plugin)

    await expect(storage.loadExpiration("campus-a")).resolves.toEqual({
      exists: false,
      expiresAt: null,
    })
    expect(plugin.getExpirationCalls).toBe(1)
    expect(plugin.getCalls).toBe(0)
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
