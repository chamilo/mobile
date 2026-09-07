import { describe, expect, it } from "vitest"

import type {
  ChamiloSecureStoragePlugin,
  SecureStorageGetOptions,
  SecureStorageGetResult,
  SecureStorageSetOptions,
} from "@/services/auth/ChamiloSecureStoragePlugin"
import { NativeBiometricPreferenceRepository } from "@/services/biometrics/BiometricPreferenceRepository"

class MemorySecureStoragePlugin implements ChamiloSecureStoragePlugin {
  readonly values = new Map<string, string>()

  async get(options: SecureStorageGetOptions): Promise<SecureStorageGetResult> {
    return { value: this.values.get(options.key) ?? null }
  }

  async set(options: SecureStorageSetOptions): Promise<void> {
    this.values.set(options.key, options.value)
  }

  async remove(options: SecureStorageGetOptions): Promise<void> {
    this.values.delete(options.key)
  }
}

describe("NativeBiometricPreferenceRepository", () => {
  it("uses the campus settings namespace", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const repository = new NativeBiometricPreferenceRepository(plugin)

    await repository.setEnabled("campus-a", true)

    expect(plugin.values.get("campus-a/settings/biometric-unlock")).toBe("1")
    await expect(repository.isEnabled("campus-a")).resolves.toBe(true)
  })

  it("isolates biometric preferences by campus", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const repository = new NativeBiometricPreferenceRepository(plugin)

    await repository.setEnabled("campus-a", true)
    await repository.setEnabled("campus-b", true)
    await repository.setEnabled("campus-a", false)

    await expect(repository.isEnabled("campus-a")).resolves.toBe(false)
    await expect(repository.isEnabled("campus-b")).resolves.toBe(true)
  })
})
