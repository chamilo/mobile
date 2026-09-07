import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"

export class InMemoryTokenStorage implements TokenStorage {
  private readonly tokens = new Map<string, StoredToken>()

  async load(campusId: string): Promise<StoredToken | null> {
    const token = this.tokens.get(campusId)

    return token ? { ...token } : null
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    this.tokens.set(campusId, { ...token })
  }

  async remove(campusId: string): Promise<void> {
    this.tokens.delete(campusId)
  }
}
