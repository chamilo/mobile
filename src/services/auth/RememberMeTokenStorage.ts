import { InMemoryTokenStorage } from "@/services/auth/InMemoryTokenStorage"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"

export class RememberMeTokenStorage implements TokenStorage {
  private readonly rememberMeByCampus = new Map<string, boolean>()

  constructor(
    private readonly persistentStorage: TokenStorage,
    private readonly sessionStorage: TokenStorage = new InMemoryTokenStorage(),
  ) {}

  setRememberMe(campusId: string, rememberMe: boolean): void {
    this.rememberMeByCampus.set(campusId, rememberMe)
  }

  isRememberMeEnabled(campusId: string): boolean {
    return this.rememberMeByCampus.get(campusId) ?? true
  }

  loadSessionToken(campusId: string): Promise<StoredToken | null> {
    return this.sessionStorage.load(campusId)
  }

  loadPersistentToken(campusId: string): Promise<StoredToken | null> {
    return this.persistentStorage.load(campusId)
  }

  async load(campusId: string): Promise<StoredToken | null> {
    const sessionToken = await this.loadSessionToken(campusId)

    return sessionToken ?? this.loadPersistentToken(campusId)
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    const rememberMe = this.rememberMeByCampus.get(campusId) ?? true

    if (rememberMe) {
      await this.sessionStorage.remove(campusId)
      await this.persistentStorage.save(campusId, token)
      return
    }

    await this.persistentStorage.remove(campusId)
    await this.sessionStorage.save(campusId, token)
  }

  async remove(campusId: string): Promise<void> {
    let firstError: unknown = null

    try {
      await this.sessionStorage.remove(campusId)
    } catch (error) {
      firstError = error
    }

    try {
      await this.persistentStorage.remove(campusId)
    } catch (error) {
      firstError ??= error
    }

    this.rememberMeByCampus.delete(campusId)

    if (firstError) {
      throw firstError
    }
  }
}
