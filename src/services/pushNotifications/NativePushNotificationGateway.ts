import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"

import type {
  PushNotificationGateway,
  PushNotificationListenerHandle,
  PushPermissionState,
} from "@/services/pushNotifications/PushNotificationGateway"

const pushBuildEnabled = import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED === "true"

export class NativePushNotificationGateway implements PushNotificationGateway {
  isAvailable(): boolean {
    return (
      pushBuildEnabled &&
      Capacitor.getPlatform() === "android" &&
      Capacitor.isPluginAvailable("PushNotifications")
    )
  }

  async checkPermissions(): Promise<PushPermissionState> {
    const status = await PushNotifications.checkPermissions()

    return status.receive
  }

  async requestPermissions(): Promise<PushPermissionState> {
    const status = await PushNotifications.requestPermissions()

    return status.receive
  }

  async register(): Promise<void> {
    await PushNotifications.register()
  }

  async unregister(): Promise<void> {
    await PushNotifications.unregister()
  }

  async addRegistrationListener(
    listener: (token: string) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    return PushNotifications.addListener("registration", ({ value }) => listener(value))
  }

  async addRegistrationErrorListener(
    listener: (error: { error: string }) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    return PushNotifications.addListener("registrationError", listener)
  }

  async addActionListener(
    listener: (action: { actionId: string; data: Record<string, unknown> }) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    return PushNotifications.addListener(
      "pushNotificationActionPerformed",
      ({ actionId, notification }) =>
        listener({
          actionId,
          data:
            notification.data && typeof notification.data === "object"
              ? (notification.data as Record<string, unknown>)
              : {},
        }),
    )
  }
}

export const nativePushNotificationGateway = new NativePushNotificationGateway()
