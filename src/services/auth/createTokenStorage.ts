import { Capacitor } from "@capacitor/core"

import { developmentTokenStorage } from "@/services/auth/DevelopmentTokenStorage"
import { RememberMeTokenStorage } from "@/services/auth/RememberMeTokenStorage"
import { SecureNativeTokenStorage } from "@/services/auth/SecureNativeTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"

const persistentTokenStorage: TokenStorage = Capacitor.isNativePlatform()
  ? new SecureNativeTokenStorage()
  : developmentTokenStorage

const tokenStorage = new RememberMeTokenStorage(persistentTokenStorage)

export function setRememberMeForCampus(campusId: string, rememberMe: boolean): void {
  tokenStorage.setRememberMe(campusId, rememberMe)
}

export function createTokenStorage(): TokenStorage {
  return tokenStorage
}
