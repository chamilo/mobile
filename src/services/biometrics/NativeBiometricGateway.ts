import { Capacitor } from "@capacitor/core"

import { i18n } from "@/i18n"
import type {
  BiometricAuthenticationResult,
  BiometricAvailability,
  BiometricGateway,
} from "@/services/biometrics/BiometricGateway"
import {
  chamiloBiometricPlugin,
  type ChamiloBiometricPlugin,
} from "@/services/biometrics/ChamiloBiometricPlugin"

export class NativeBiometricGateway implements BiometricGateway {
  constructor(private readonly plugin: ChamiloBiometricPlugin = chamiloBiometricPlugin) {}

  isSupportedPlatform(): boolean {
    if (!Capacitor.isNativePlatform()) return false

    const platform = Capacitor.getPlatform()

    return platform === "android" || platform === "ios"
  }

  async getAvailability(): Promise<BiometricAvailability> {
    if (!this.isSupportedPlatform()) return "unsupported"

    try {
      return (await this.plugin.status()).status
    } catch {
      return "unavailable"
    }
  }

  async authenticate(): Promise<BiometricAuthenticationResult> {
    if (!this.isSupportedPlatform()) return "unavailable"

    try {
      const result = await this.plugin.authenticate({
        title: String(i18n.global.t("biometrics.prompt.title")),
        subtitle: String(i18n.global.t("biometrics.prompt.subtitle")),
        cancelLabel: String(i18n.global.t("biometrics.prompt.cancel")),
      })

      return result.status
    } catch {
      return "error"
    }
  }
}

export const nativeBiometricGateway = new NativeBiometricGateway()
