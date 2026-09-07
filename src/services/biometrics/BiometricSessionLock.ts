import type {
  BiometricAuthenticationResult,
  BiometricAvailability,
  BiometricGateway,
} from "@/services/biometrics/BiometricGateway"
import {
  nativeBiometricPreferenceRepository,
  type BiometricPreferenceRepository,
} from "@/services/biometrics/BiometricPreferenceRepository"
import { nativeBiometricGateway } from "@/services/biometrics/NativeBiometricGateway"

export type BiometricUnlockResult =
  | "not_required"
  | "unlocked"
  | "cancelled"
  | "unavailable"
  | "error"

export type BiometricToggleResult =
  | "enabled"
  | "disabled"
  | "unsupported"
  | "not_enrolled"
  | "unavailable"
  | "temporary_unavailable"
  | "cancelled"
  | "error"

export interface BiometricSessionLockState {
  supportedPlatform: boolean
  availability: BiometricAvailability
  enabled: boolean
}

function mapAuthenticationResult(
  result: BiometricAuthenticationResult,
): Exclude<BiometricUnlockResult, "not_required"> {
  if (result === "success") return "unlocked"
  if (result === "cancelled") return "cancelled"
  if (result === "unavailable") return "unavailable"

  return "error"
}

export class BiometricSessionLock {
  constructor(
    private readonly gateway: BiometricGateway = nativeBiometricGateway,
    private readonly preferences: BiometricPreferenceRepository = nativeBiometricPreferenceRepository,
  ) {}

  async getState(campusId: string): Promise<BiometricSessionLockState> {
    const supportedPlatform = this.gateway.isSupportedPlatform()

    if (!supportedPlatform) {
      return {
        supportedPlatform: false,
        availability: "unsupported",
        enabled: false,
      }
    }

    const availability = await this.gateway.getAvailability()
    let enabled: boolean

    try {
      enabled = await this.preferences.isEnabled(campusId)
    } catch {
      enabled = false
    }

    return {
      supportedPlatform: true,
      availability,
      enabled,
    }
  }

  async enable(campusId: string): Promise<BiometricToggleResult> {
    if (!this.gateway.isSupportedPlatform()) return "unsupported"

    const availability = await this.gateway.getAvailability()

    if (availability !== "available") {
      return availability === "unsupported" ? "unsupported" : availability
    }

    const result = mapAuthenticationResult(await this.gateway.authenticate())

    if (result !== "unlocked") {
      return result === "unavailable" ? "unavailable" : result
    }

    try {
      await this.preferences.setEnabled(campusId, true)
      return "enabled"
    } catch {
      return "error"
    }
  }

  async disable(campusId: string): Promise<BiometricToggleResult> {
    try {
      await this.preferences.setEnabled(campusId, false)
      return "disabled"
    } catch {
      return "error"
    }
  }

  async unlockIfEnabled(campusId: string): Promise<BiometricUnlockResult> {
    if (!this.gateway.isSupportedPlatform()) return "not_required"

    let enabled: boolean

    try {
      enabled = await this.preferences.isEnabled(campusId)
    } catch {
      return "error"
    }

    if (!enabled) return "not_required"

    const availability = await this.gateway.getAvailability()

    if (availability !== "available") return "unavailable"

    return mapAuthenticationResult(await this.gateway.authenticate())
  }

  async clear(campusId: string): Promise<void> {
    await this.preferences.setEnabled(campusId, false)
  }
}

export const biometricSessionLock = new BiometricSessionLock()
