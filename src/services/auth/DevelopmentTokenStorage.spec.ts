import { describe, expect, it } from "vitest"

import { DevelopmentTokenStorage } from "@/services/auth/DevelopmentTokenStorage"

describe("DevelopmentTokenStorage", () => {
  it("isolates tokens by campus and returns copies", async () => {
    const storage = new DevelopmentTokenStorage()

    await storage.save("campus-a", { token: "token-a", expiresAt: 10 })
    await storage.save("campus-b", { token: "token-b", expiresAt: 20 })

    expect(await storage.load("campus-a")).toEqual({ token: "token-a", expiresAt: 10 })
    expect(await storage.load("campus-b")).toEqual({ token: "token-b", expiresAt: 20 })
  })

  it("removes only the selected campus token", async () => {
    const storage = new DevelopmentTokenStorage()

    await storage.save("campus-a", { token: "token-a", expiresAt: null })
    await storage.save("campus-b", { token: "token-b", expiresAt: null })
    await storage.remove("campus-a")

    expect(await storage.load("campus-a")).toBeNull()
    expect(await storage.load("campus-b")).not.toBeNull()
  })
})
