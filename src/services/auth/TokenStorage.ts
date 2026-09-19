export interface StoredToken {
  token: string
  expiresAt: number | null
}

export interface StoredTokenExpiration {
  exists: boolean
  expiresAt: number | null
}

export interface TokenStorage {
  load(campusId: string): Promise<StoredToken | null>
  save(campusId: string, token: StoredToken): Promise<void>
  remove(campusId: string): Promise<void>
}

export interface TokenExpirationReader {
  loadExpiration(campusId: string): Promise<StoredTokenExpiration>
}

export function supportsTokenExpirationReader(
  storage: TokenStorage,
): storage is TokenStorage & TokenExpirationReader {
  return typeof (storage as Partial<TokenExpirationReader>).loadExpiration === "function"
}

export class StoredTokenExpiredError extends Error {
  constructor() {
    super("The stored session has expired.")
    this.name = "StoredTokenExpiredError"
  }
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
