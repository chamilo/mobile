import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import {
  chamiloSecureStoragePlugin,
  type ChamiloSecureStoragePlugin,
} from "@/services/auth/ChamiloSecureStoragePlugin"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"

function isStoredToken(value: unknown): value is StoredToken {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<StoredToken>

  return (
    typeof candidate.token === "string" &&
    candidate.token.length > 0 &&
    (candidate.expiresAt === null ||
      (typeof candidate.expiresAt === "number" && Number.isFinite(candidate.expiresAt)))
  )
}

function parseStoredToken(serialized: string): StoredToken {
  const value: unknown = JSON.parse(serialized)

  if (!isStoredToken(value)) {
    throw new Error("Stored token format is invalid.")
  }

  return {
    token: value.token,
    expiresAt: value.expiresAt,
  }
}

export class SecureNativeTokenStorage implements TokenStorage {
  constructor(private readonly plugin: ChamiloSecureStoragePlugin = chamiloSecureStoragePlugin) {}

  async load(campusId: string): Promise<StoredToken | null> {
    const key = buildCampusNamespace(campusId, "token")

    try {
      const result = await this.plugin.get({ key })

      if (result.value === null) {
        return null
      }

      if (typeof result.value !== "string") {
        await this.plugin.remove({ key }).catch(() => undefined)
        throw new Error("Secure storage returned an invalid value.")
      }

      try {
        return parseStoredToken(result.value)
      } catch (error) {
        await this.plugin.remove({ key }).catch(() => undefined)
        throw error
      }
    } catch (error) {
      throw new TokenStorageError("read", "The secure token could not be read.", error)
    }
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    const key = buildCampusNamespace(campusId, "token")

    if (!isStoredToken(token)) {
      throw new TokenStorageError("write", "The secure token format is invalid.")
    }

    try {
      await this.plugin.set({
        key,
        value: JSON.stringify(token),
      })
    } catch (error) {
      throw new TokenStorageError("write", "The secure token could not be saved.", error)
    }
  }

  async remove(campusId: string): Promise<void> {
    const key = buildCampusNamespace(campusId, "token")

    try {
      await this.plugin.remove({ key })
    } catch (error) {
      throw new TokenStorageError("remove", "The secure token could not be removed.", error)
    }
  }
}
