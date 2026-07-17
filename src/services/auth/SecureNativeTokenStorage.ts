import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"

export class SecureNativeTokenStorage implements TokenStorage {
  private unsupported(): never {
    throw new TokenStorageError(
      "unsupported",
      "Secure native token storage will be implemented in the security batch.",
    )
  }

  async load(campusId: string): Promise<StoredToken | null> {
    void campusId

    return this.unsupported()
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    void campusId
    void token

    return this.unsupported()
  }

  async remove(campusId: string): Promise<void> {
    void campusId

    return this.unsupported()
  }
}
