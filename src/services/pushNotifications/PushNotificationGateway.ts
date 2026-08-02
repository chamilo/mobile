export type PushPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied"

export interface PushNotificationRegistrationError {
  error: string
}

export interface PushNotificationAction {
  actionId: string
  data: Record<string, unknown>
}

export interface PushNotificationListenerHandle {
  remove(): Promise<void>
}

export interface PushNotificationGateway {
  isAvailable(): boolean
  checkPermissions(): Promise<PushPermissionState>
  requestPermissions(): Promise<PushPermissionState>
  register(): Promise<void>
  unregister(): Promise<void>
  addRegistrationListener(
    listener: (token: string) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle>
  addRegistrationErrorListener(
    listener: (error: PushNotificationRegistrationError) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle>
  addActionListener(
    listener: (action: PushNotificationAction) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle>
}
