import { registerPlugin } from "@capacitor/core"

import type {
  BiometricAuthenticationResult,
  BiometricAvailability,
} from "@/services/biometrics/BiometricGateway"

export interface BiometricAuthenticateOptions {
  title: string
  subtitle: string
  cancelLabel: string
}

export interface BiometricStatusResult {
  status: Exclude<BiometricAvailability, "unsupported">
}

export interface BiometricAuthenticateResult {
  status: BiometricAuthenticationResult
}

export interface ChamiloBiometricPlugin {
  status(): Promise<BiometricStatusResult>
  authenticate(options: BiometricAuthenticateOptions): Promise<BiometricAuthenticateResult>
}

export const chamiloBiometricPlugin = registerPlugin<ChamiloBiometricPlugin>("ChamiloBiometric")
