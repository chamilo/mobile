import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import {
  chamiloSecureStoragePlugin,
  type ChamiloSecureStoragePlugin,
} from "@/services/auth/ChamiloSecureStoragePlugin"

const PUSH_NOTIFICATIONS_KEY = "push-notifications"

export interface PushNotificationPreferenceRepository {
  isEnabled(campusId: string): Promise<boolean>
  setEnabled(campusId: string, enabled: boolean): Promise<void>
}

export class PushNotificationPreferenceStorageError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "PushNotificationPreferenceStorageError"
  }
}

export class NativePushNotificationPreferenceRepository implements PushNotificationPreferenceRepository {
  constructor(private readonly plugin: ChamiloSecureStoragePlugin = chamiloSecureStoragePlugin) {}

  async isEnabled(campusId: string): Promise<boolean> {
    const key = buildCampusNamespace(campusId, "settings", PUSH_NOTIFICATIONS_KEY)

    try {
      const result = await this.plugin.get({ key })

      if (result.value === null) {
        return true
      }

      if (result.value === "1") {
        return true
      }

      if (result.value === "0") {
        return false
      }

      throw new PushNotificationPreferenceStorageError(
        "The stored push notification preference is invalid.",
      )
    } catch (error) {
      if (error instanceof PushNotificationPreferenceStorageError) {
        throw error
      }

      throw new PushNotificationPreferenceStorageError(
        "The push notification preference could not be read.",
        error,
      )
    }
  }

  async setEnabled(campusId: string, enabled: boolean): Promise<void> {
    const key = buildCampusNamespace(campusId, "settings", PUSH_NOTIFICATIONS_KEY)

    try {
      await this.plugin.set({ key, value: enabled ? "1" : "0" })
    } catch (error) {
      throw new PushNotificationPreferenceStorageError(
        "The push notification preference could not be saved.",
        error,
      )
    }
  }
}

export const nativePushNotificationPreferenceRepository =
  new NativePushNotificationPreferenceRepository()
