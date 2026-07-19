import { describe, expect, it } from "vitest"

import { DevelopmentTokenStorage } from "@/services/auth/DevelopmentTokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

describe("DevelopmentTokenStorage", () => {
  it("persists tokens across storage instances and isolates campuses", async () => {
    const browserStorage = createMemoryStorage()
    const firstInstance = new DevelopmentTokenStorage(browserStorage)

    await firstInstance.save("campus-a", { token: "token-a", expiresAt: 10 })
    await firstInstance.save("campus-b", { token: "token-b", expiresAt: 20 })

    const restoredInstance = new DevelopmentTokenStorage(browserStorage)

    expect(await restoredInstance.load("campus-a")).toEqual({
      token: "token-a",
      expiresAt: 10,
    })
    expect(await restoredInstance.load("campus-b")).toEqual({
      token: "token-b",
      expiresAt: 20,
    })
  })

  it("stores tokens under the required campus namespace", async () => {
    const browserStorage = createMemoryStorage()
    const storage = new DevelopmentTokenStorage(browserStorage)

    await storage.save("campus-a", { token: "token-a", expiresAt: null })

    expect(browserStorage.getItem("campus-a/token")).toBe(
      JSON.stringify({ token: "token-a", expiresAt: null }),
    )
  })

  it("removes only the selected campus token", async () => {
    const browserStorage = createMemoryStorage()
    const storage = new DevelopmentTokenStorage(browserStorage)

    await storage.save("campus-a", { token: "token-a", expiresAt: null })
    await storage.save("campus-b", { token: "token-b", expiresAt: null })
    await storage.remove("campus-a")

    expect(await storage.load("campus-a")).toBeNull()
    expect(await storage.load("campus-b")).not.toBeNull()
  })

  it("removes and rejects invalid stored data", async () => {
    const browserStorage = createMemoryStorage()
    browserStorage.setItem("campus-a/token", '{"token":""}')
    const storage = new DevelopmentTokenStorage(browserStorage)

    await expect(storage.load("campus-a")).rejects.toBeInstanceOf(TokenStorageError)
    expect(browserStorage.getItem("campus-a/token")).toBeNull()
  })
})
