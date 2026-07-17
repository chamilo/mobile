export interface StoredToken {
  token: string
  expiresAt: number | null
}

export interface TokenStorage {
  load(campusId: string): Promise<StoredToken | null>
  save(campusId: string, token: StoredToken): Promise<void>
  remove(campusId: string): Promise<void>
}

export type TokenStorageErrorKind = "read" | "write" | "remove" | "unsupported"

export class TokenStorageError extends Error {
  constructor(
    public readonly kind: TokenStorageErrorKind,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "TokenStorageError"
  }
}
