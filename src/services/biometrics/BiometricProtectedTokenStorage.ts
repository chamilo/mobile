import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"
import type { RememberMeTokenStorage } from "@/services/auth/RememberMeTokenStorage"
import {
  biometricSessionLock,
  type BiometricSessionLock,
} from "@/services/biometrics/BiometricSessionLock"

export class BiometricProtectedTokenStorage implements TokenStorage {
  constructor(
    private readonly source: RememberMeTokenStorage,
    private readonly sessionLock: BiometricSessionLock = biometricSessionLock,
  ) {}

  async load(campusId: string): Promise<StoredToken | null> {
    const sessionToken = await this.source.loadSessionToken(campusId)

    if (sessionToken) return sessionToken

    const unlockResult = await this.sessionLock.unlockIfEnabled(campusId)

    if (unlockResult !== "not_required" && unlockResult !== "unlocked") {
      return null
    }

    const persistentToken = await this.source.loadPersistentToken(campusId)

    if (!persistentToken) {
      return null
    }

    await this.source.saveSessionToken(campusId, persistentToken)

    return persistentToken
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    await this.source.save(campusId, token)

    if (!this.source.isRememberMeEnabled(campusId)) {
      await this.sessionLock.clear(campusId).catch(() => undefined)
    }
  }

  async remove(campusId: string): Promise<void> {
    // Logout removes authentication material only. The biometric preference is
    // a campus setting and intentionally survives logout so the next remembered
    // session remains protected unless the user explicitly disables biometrics.
    await this.source.remove(campusId)
  }
}
