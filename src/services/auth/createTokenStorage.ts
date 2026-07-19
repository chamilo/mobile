import { Capacitor } from "@capacitor/core"

import { developmentTokenStorage } from "@/services/auth/DevelopmentTokenStorage"
import { SecureNativeTokenStorage } from "@/services/auth/SecureNativeTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"

export function createTokenStorage(): TokenStorage {
  if (Capacitor.isNativePlatform()) {
    return new SecureNativeTokenStorage()
  }

  return developmentTokenStorage
}
