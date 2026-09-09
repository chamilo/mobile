import { describe, expect, it } from "vitest"

import { InMemoryTokenStorage } from "@/services/auth/InMemoryTokenStorage"
import { RememberMeTokenStorage } from "@/services/auth/RememberMeTokenStorage"
import type { StoredToken } from "@/services/auth/TokenStorage"
import { BiometricProtectedTokenStorage } from "@/services/biometrics/BiometricProtectedTokenStorage"
import type {
  BiometricSessionLock,
  BiometricUnlockResult,
} from "@/services/biometrics/BiometricSessionLock"

const token: StoredToken = {
  token: "jwt-token",
  expiresAt: 123456,
}

class FakeSessionLock {
  unlockResult: BiometricUnlockResult = "not_required"
  unlockCalls = 0
  clearCalls = 0

  async unlockIfEnabled(): Promise<BiometricUnlockResult> {
    this.unlockCalls += 1
    return this.unlockResult
  }

  async clear(): Promise<void> {
    this.clearCalls += 1
  }
}

function createStorage() {
  const persistent = new InMemoryTokenStorage()
  const session = new InMemoryTokenStorage()
  const rememberMe = new RememberMeTokenStorage(persistent, session)
  const lock = new FakeSessionLock()
  const storage = new BiometricProtectedTokenStorage(
    rememberMe,
    lock as unknown as BiometricSessionLock,
  )

  return { persistent, session, rememberMe, lock, storage }
}

describe("BiometricProtectedTokenStorage", () => {
  it("returns a temporary session without requesting biometrics", async () => {
    const { rememberMe, lock, storage } = createStorage()
    rememberMe.setRememberMe("campus-a", false)
    await storage.save("campus-a", token)
    lock.unlockCalls = 0

    await expect(storage.load("campus-a")).resolves.toEqual(token)
    expect(lock.unlockCalls).toBe(0)
  })

  it("returns a remembered token from the current process without requesting biometrics again", async () => {
    const { rememberMe, lock, storage } = createStorage()
    rememberMe.setRememberMe("campus-a", true)
    await storage.save("campus-a", token)
    lock.unlockCalls = 0

    await expect(storage.load("campus-a")).resolves.toEqual(token)
    expect(lock.unlockCalls).toBe(0)
  })

  it("unlocks a restored remembered token once and caches it for the current process", async () => {
    const { persistent, lock, storage } = createStorage()
    await persistent.save("campus-a", token)
    lock.unlockResult = "unlocked"

    await expect(storage.load("campus-a")).resolves.toEqual(token)
    await expect(storage.load("campus-a")).resolves.toEqual(token)

    expect(lock.unlockCalls).toBe(1)
  })

  it("keeps a restored remembered token locked when authentication is cancelled", async () => {
    const { persistent, lock, storage } = createStorage()
    await persistent.save("campus-a", token)
    lock.unlockResult = "cancelled"

    await expect(storage.load("campus-a")).resolves.toBeNull()
    expect(await persistent.load("campus-a")).toEqual(token)
    expect(lock.unlockCalls).toBe(1)
  })

  it("clears biometric preference when Remember me is disabled", async () => {
    const { rememberMe, lock, storage } = createStorage()
    rememberMe.setRememberMe("campus-a", false)

    await storage.save("campus-a", token)

    expect(lock.clearCalls).toBe(1)
  })

  it("clears biometric preference during logout token removal", async () => {
    const { rememberMe, lock, storage } = createStorage()
    rememberMe.setRememberMe("campus-a", true)
    await storage.save("campus-a", token)

    await storage.remove("campus-a")

    expect(lock.clearCalls).toBe(1)
    await expect(storage.load("campus-a")).resolves.toBeNull()
  })
})
