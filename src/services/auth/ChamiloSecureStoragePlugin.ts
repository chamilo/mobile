import { registerPlugin } from "@capacitor/core"

export interface SecureStorageGetOptions {
  key: string
}

export interface SecureStorageSetOptions extends SecureStorageGetOptions {
  value: string
}

export interface SecureStorageGetResult {
  value: string | null
}

export interface ChamiloSecureStoragePlugin {
  get(options: SecureStorageGetOptions): Promise<SecureStorageGetResult>
  set(options: SecureStorageSetOptions): Promise<void>
  remove(options: SecureStorageGetOptions): Promise<void>
}

export const chamiloSecureStoragePlugin =
  registerPlugin<ChamiloSecureStoragePlugin>("ChamiloSecureStorage")
