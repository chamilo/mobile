export type BiometricAvailability =
  | "available"
  | "not_enrolled"
  | "unavailable"
  | "temporary_unavailable"
  | "unsupported"

export type BiometricAuthenticationResult =
  | "success"
  | "cancelled"
  | "unavailable"
  | "error"

export interface BiometricGateway {
  isSupportedPlatform(): boolean
  getAvailability(): Promise<BiometricAvailability>
  authenticate(): Promise<BiometricAuthenticationResult>
}
