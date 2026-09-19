import { normalizeChamiloLocale } from "@/domain/i18n/locale"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type UserProfileUpdateErrorCode =
  | "session_expired"
  | "access_denied"
  | "validation"
  | "network"
  | "timeout"
  | "server"

export class UserProfileUpdateError extends Error {
  constructor(
    public readonly code: UserProfileUpdateErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "UserProfileUpdateError"
  }
}

function mapUpdateError(error: unknown): UserProfileUpdateError {
  if (error instanceof UserProfileUpdateError) return error

  if (!(error instanceof HttpClientError)) {
    return new UserProfileUpdateError("server", "The user profile could not be updated.", error)
  }

  if (error.kind === "network") {
    return new UserProfileUpdateError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new UserProfileUpdateError("timeout", error.message, error)
  }

  if (error.kind === "authentication" || (error.kind === "http" && error.status === 401)) {
    return new UserProfileUpdateError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new UserProfileUpdateError("access_denied", error.message, error)
  }

  if (error.kind === "http" && (error.status === 400 || error.status === 422)) {
    return new UserProfileUpdateError("validation", error.message, error)
  }

  return new UserProfileUpdateError("server", error.message, error)
}

export class UserProfileApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async updateLocale(userId: number, locale: string): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UserProfileUpdateError("validation", "User ID must be a positive integer.")
    }

    const normalizedLocale = normalizeChamiloLocale(locale)

    if (!normalizedLocale) {
      throw new UserProfileUpdateError("validation", "The user locale is required.")
    }

    try {
      await this.httpClient.request<unknown, { locale: string }>({
        method: "PATCH",
        path: `/api/users/${userId}`,
        headers: {
          Accept: "application/ld+json",
          "Content-Type": "application/merge-patch+json",
        },
        body: { locale: normalizedLocale },
      })
    } catch (error) {
      throw mapUpdateError(error)
    }
  }
}
