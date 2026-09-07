import { describe, expect, it } from "vitest"

import { InMemoryTokenStorage } from "@/services/auth/InMemoryTokenStorage"
import { RememberMeTokenStorage } from "@/services/auth/RememberMeTokenStorage"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"

class MemoryTokenStorage implements TokenStorage {
  readonly tokens = new Map<string, StoredToken>()

  async load(campusId: string): Promise<StoredToken | null> {
    const token = this.tokens.get(campusId)

    return token ? { ...token } : null
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    this.tokens.set(campusId, { ...token })
  }

  async remove(campusId: string): Promise<void> {
    this.tokens.delete(campusId)
  }
}

const token: StoredToken = {
  token: "header.payload.signature",
  expiresAt: 2_000_000_000_000,
}

describe("RememberMeTokenStorage", () => {
  it("persists tokens by default to preserve the existing mobile session behavior", async () => {
    const persistent = new MemoryTokenStorage()
    const storage = new RememberMeTokenStorage(persistent)

    await storage.save("campus-1", token)

    expect(await persistent.load("campus-1")).toEqual(token)
  })

  it("keeps a non-remembered token only in the current app process", async () => {
    const persistent = new MemoryTokenStorage()
    const session = new InMemoryTokenStorage()
    const storage = new RememberMeTokenStorage(persistent, session)
    await persistent.save("campus-1", token)

    storage.setRememberMe("campus-1", false)
    await storage.save("campus-1", token)

    expect(await persistent.load("campus-1")).toBeNull()
    expect(await storage.load("campus-1")).toEqual(token)

    const afterRestart = new RememberMeTokenStorage(persistent)
    expect(await afterRestart.load("campus-1")).toBeNull()
  })

  it("restores a remembered token after a new storage instance is created", async () => {
    const persistent = new MemoryTokenStorage()
    const storage = new RememberMeTokenStorage(persistent)

    storage.setRememberMe("campus-1", true)
    await storage.save("campus-1", token)

    const afterRestart = new RememberMeTokenStorage(persistent)
    expect(await afterRestart.load("campus-1")).toEqual(token)
  })

  it("removes both persistent and process-only tokens on logout", async () => {
    const persistent = new MemoryTokenStorage()
    const session = new InMemoryTokenStorage()
    const storage = new RememberMeTokenStorage(persistent, session)

    await persistent.save("campus-1", token)
    await session.save("campus-1", token)

    await storage.remove("campus-1")

    expect(await persistent.load("campus-1")).toBeNull()
    expect(await session.load("campus-1")).toBeNull()
  })
})
