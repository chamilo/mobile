import { describe, expect, it } from "vitest"

import type {
  BiometricAuthenticationResult,
  BiometricAvailability,
  BiometricGateway,
} from "@/services/biometrics/BiometricGateway"
import type { BiometricPreferenceRepository } from "@/services/biometrics/BiometricPreferenceRepository"
import { BiometricSessionLock } from "@/services/biometrics/BiometricSessionLock"

class FakeGateway implements BiometricGateway {
  supported = true
  availability: BiometricAvailability = "available"
  authentication: BiometricAuthenticationResult = "success"
  authenticateCalls = 0

  isSupportedPlatform(): boolean {
    return this.supported
  }

  async getAvailability(): Promise<BiometricAvailability> {
    return this.availability
  }

  async authenticate(): Promise<BiometricAuthenticationResult> {
    this.authenticateCalls += 1
    return this.authentication
  }
}

class MemoryPreferences implements BiometricPreferenceRepository {
  values = new Map<string, boolean>()

  async isEnabled(campusId: string): Promise<boolean> {
    return this.values.get(campusId) ?? false
  }

  async setEnabled(campusId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      this.values.set(campusId, true)
      return
    }

    this.values.delete(campusId)
  }
}

describe("BiometricSessionLock", () => {
  it("does not prompt when biometric unlock is disabled", async () => {
    const gateway = new FakeGateway()
    const preferences = new MemoryPreferences()
    const lock = new BiometricSessionLock(gateway, preferences)

    await expect(lock.unlockIfEnabled("campus-a")).resolves.toBe("not_required")
    expect(gateway.authenticateCalls).toBe(0)
  })

  it("enables biometric unlock only after successful authentication", async () => {
    const gateway = new FakeGateway()
    const preferences = new MemoryPreferences()
    const lock = new BiometricSessionLock(gateway, preferences)

    await expect(lock.enable("campus-a")).resolves.toBe("enabled")
    expect(await preferences.isEnabled("campus-a")).toBe(true)
    expect(gateway.authenticateCalls).toBe(1)
  })

  it("does not persist the preference when the user cancels", async () => {
    const gateway = new FakeGateway()
    gateway.authentication = "cancelled"
    const preferences = new MemoryPreferences()
    const lock = new BiometricSessionLock(gateway, preferences)

    await expect(lock.enable("campus-a")).resolves.toBe("cancelled")
    expect(await preferences.isEnabled("campus-a")).toBe(false)
  })

  it("reports enrollment requirements without opening the prompt", async () => {
    const gateway = new FakeGateway()
    gateway.availability = "not_enrolled"
    const preferences = new MemoryPreferences()
    const lock = new BiometricSessionLock(gateway, preferences)

    await expect(lock.enable("campus-a")).resolves.toBe("not_enrolled")
    expect(gateway.authenticateCalls).toBe(0)
  })

  it("requires authentication before unlocking an enabled session", async () => {
    const gateway = new FakeGateway()
    const preferences = new MemoryPreferences()
    preferences.values.set("campus-a", true)
    const lock = new BiometricSessionLock(gateway, preferences)

    await expect(lock.unlockIfEnabled("campus-a")).resolves.toBe("unlocked")
    expect(gateway.authenticateCalls).toBe(1)
  })
})
