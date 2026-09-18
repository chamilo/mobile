import { describe, expect, it } from "vitest"

import type { ChamiloSecureStoragePlugin } from "@/services/auth/ChamiloSecureStoragePlugin"
import {
  NativePushNotificationPreferenceRepository,
  PushNotificationPreferenceStorageError,
} from "@/services/pushNotifications/PushNotificationPreferenceRepository"

class MemorySecureStoragePlugin implements ChamiloSecureStoragePlugin {
  readonly values = new Map<string, string>()

  async get({ key }: { key: string }) {
    return { value: this.values.get(key) ?? null }
  }

  async set({ key, value }: { key: string; value: string }): Promise<void> {
    this.values.set(key, value)
  }

  async remove({ key }: { key: string }): Promise<void> {
    this.values.delete(key)
  }
}

describe("NativePushNotificationPreferenceRepository", () => {
  it("defaults notifications to enabled until the user explicitly disables them", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const repository = new NativePushNotificationPreferenceRepository(plugin)

    await expect(repository.isEnabled("campus-a")).resolves.toBe(true)
  })

  it("persists the preference in the campus settings namespace", async () => {
    const plugin = new MemorySecureStoragePlugin()
    const repository = new NativePushNotificationPreferenceRepository(plugin)

    await repository.setEnabled("campus-a", false)

    expect(plugin.values.get("campus-a/settings/push-notifications")).toBe("0")
    await expect(repository.isEnabled("campus-a")).resolves.toBe(false)

    await repository.setEnabled("campus-a", true)
    expect(plugin.values.get("campus-a/settings/push-notifications")).toBe("1")
    await expect(repository.isEnabled("campus-a")).resolves.toBe(true)
  })

  it("rejects an invalid stored preference instead of silently re-enabling push", async () => {
    const plugin = new MemorySecureStoragePlugin()
    plugin.values.set("campus-a/settings/push-notifications", "unexpected")
    const repository = new NativePushNotificationPreferenceRepository(plugin)

    await expect(repository.isEnabled("campus-a")).rejects.toBeInstanceOf(
      PushNotificationPreferenceStorageError,
    )
  })
})
