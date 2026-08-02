import { describe, expect, it } from "vitest"

import { BrowserPushInstallationRepository } from "@/services/pushNotifications/BrowserPushInstallationRepository"

class MemoryStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe("BrowserPushInstallationRepository", () => {
  it("keeps a stable installation identifier in the selected campus namespace", () => {
    const storage = new MemoryStorage()
    const installationId = "11111111-1111-4111-8111-111111111111"
    const repository = new BrowserPushInstallationRepository(storage, () => installationId)

    expect(repository.prepare("campus-one", 7)).toEqual({
      installationId,
      userId: 7,
      registeredAt: null,
    })

    repository.markRegistered("campus-one", 7)

    expect(repository.load("campus-one")).toEqual({
      installationId,
      userId: 7,
      registeredAt: expect.any(String),
    })
    expect([...storage.values.keys()]).toEqual([
      "chamilo.mobile.campus/campus-one/push-installation.v1",
    ])
  })

  it("clears the account registration without changing the installation identifier", () => {
    const storage = new MemoryStorage()
    const installationId = "22222222-2222-4222-8222-222222222222"
    const repository = new BrowserPushInstallationRepository(storage, () => installationId)

    repository.prepare("campus-one", 7)
    repository.clearRegistration("campus-one")

    expect(repository.load("campus-one")).toBeNull()
    expect(repository.prepare("campus-one", 8).installationId).toBe(installationId)
  })
})
