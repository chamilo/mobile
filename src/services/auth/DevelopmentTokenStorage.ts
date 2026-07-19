import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
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
    (typeof candidate.expiresAt === "number" || candidate.expiresAt === null)
  )
}

export class DevelopmentTokenStorage implements TokenStorage {
  constructor(private readonly storage: Storage = window.sessionStorage) {}

  async load(campusId: string): Promise<StoredToken | null> {
    const key = buildCampusNamespace(campusId, "token")

    try {
      const serialized = this.storage.getItem(key)

      if (!serialized) {
        return null
      }

      const token: unknown = JSON.parse(serialized)

      if (!isStoredToken(token)) {
        this.storage.removeItem(key)
        throw new Error("Stored token format is invalid.")
      }

      return { ...token }
    } catch (error) {
      throw new TokenStorageError("read", "The development token could not be read.", error)
    }
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    const key = buildCampusNamespace(campusId, "token")

    try {
      this.storage.setItem(key, JSON.stringify(token))
    } catch (error) {
      throw new TokenStorageError("write", "The development token could not be saved.", error)
    }
  }

  async remove(campusId: string): Promise<void> {
    const key = buildCampusNamespace(campusId, "token")

    try {
      this.storage.removeItem(key)
    } catch (error) {
      throw new TokenStorageError("remove", "The development token could not be removed.", error)
    }
  }
}

export const developmentTokenStorage = new DevelopmentTokenStorage()
