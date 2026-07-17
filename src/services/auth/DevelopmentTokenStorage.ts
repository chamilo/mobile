import { buildCampusNamespace } from "@/domain/campus/campusNamespace"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"

export class DevelopmentTokenStorage implements TokenStorage {
  private readonly tokens = new Map<string, StoredToken>()

  async load(campusId: string): Promise<StoredToken | null> {
    const token = this.tokens.get(buildCampusNamespace(campusId, "token"))

    return token ? { ...token } : null
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    this.tokens.set(buildCampusNamespace(campusId, "token"), { ...token })
  }

  async remove(campusId: string): Promise<void> {
    this.tokens.delete(buildCampusNamespace(campusId, "token"))
  }
}

export const developmentTokenStorage = new DevelopmentTokenStorage()
