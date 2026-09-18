import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import {
  chamiloSecureStoragePlugin,
  type ChamiloSecureStoragePlugin,
} from "@/services/auth/ChamiloSecureStoragePlugin"

const BIOMETRIC_UNLOCK_KEY = "biometric-unlock"

export interface BiometricPreferenceRepository {
  isEnabled(campusId: string): Promise<boolean>
  setEnabled(campusId: string, enabled: boolean): Promise<void>
}

export class NativeBiometricPreferenceRepository implements BiometricPreferenceRepository {
  constructor(private readonly plugin: ChamiloSecureStoragePlugin = chamiloSecureStoragePlugin) {}

  async isEnabled(campusId: string): Promise<boolean> {
    const key = buildCampusNamespace(campusId, "settings", BIOMETRIC_UNLOCK_KEY)
    const result = await this.plugin.get({ key })

    return result.value !== "0"
  }

  async setEnabled(campusId: string, enabled: boolean): Promise<void> {
    const key = buildCampusNamespace(campusId, "settings", BIOMETRIC_UNLOCK_KEY)

    await this.plugin.set({ key, value: enabled ? "1" : "0" })
  }
}

export const nativeBiometricPreferenceRepository = new NativeBiometricPreferenceRepository()
