import { Capacitor } from "@capacitor/core"

import { developmentTokenStorage } from "@/services/auth/DevelopmentTokenStorage"
import { RememberMeTokenStorage } from "@/services/auth/RememberMeTokenStorage"
import { SecureNativeTokenStorage } from "@/services/auth/SecureNativeTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"
import { BiometricProtectedTokenStorage } from "@/services/biometrics/BiometricProtectedTokenStorage"
import {
  biometricSessionLock,
  type BiometricToggleResult,
} from "@/services/biometrics/BiometricSessionLock"
import type { BiometricAvailability } from "@/services/biometrics/BiometricGateway"

const persistentTokenStorage: TokenStorage = Capacitor.isNativePlatform()
  ? new SecureNativeTokenStorage()
  : developmentTokenStorage

const rememberMeTokenStorage = new RememberMeTokenStorage(persistentTokenStorage)
const biometricProtectedTokenStorage = new BiometricProtectedTokenStorage(rememberMeTokenStorage)
const usesAndroidBiometrics =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
const tokenStorage: TokenStorage = usesAndroidBiometrics
  ? biometricProtectedTokenStorage
  : rememberMeTokenStorage

export interface BiometricUnlockState {
  supportedPlatform: boolean
  availability: BiometricAvailability
  enabled: boolean
  rememberedSession: boolean
}

export type BiometricUnlockToggleResult = BiometricToggleResult | "remember_me_required"

export function setRememberMeForCampus(campusId: string, rememberMe: boolean): void {
  rememberMeTokenStorage.setRememberMe(campusId, rememberMe)
}

export async function getBiometricUnlockStateForCampus(
  campusId: string,
): Promise<BiometricUnlockState> {
  const state = await biometricSessionLock.getState(campusId)

  return {
    ...state,
    rememberedSession: rememberMeTokenStorage.isRememberMeEnabled(campusId),
  }
}

export async function setBiometricUnlockForCampus(
  campusId: string,
  enabled: boolean,
): Promise<BiometricUnlockToggleResult> {
  if (enabled && !rememberMeTokenStorage.isRememberMeEnabled(campusId)) {
    return "remember_me_required"
  }

  return enabled ? biometricSessionLock.enable(campusId) : biometricSessionLock.disable(campusId)
}

export function createTokenStorage(): TokenStorage {
  return tokenStorage
}
