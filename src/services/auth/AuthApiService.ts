import type { AuthCredentials, AuthErrorCode, CurrentUserProfile } from "@/domain/auth/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

interface AuthenticationTokenResponse {
  token?: unknown
}

type CurrentUserProfileResponse = Partial<CurrentUserProfile> & Record<string, unknown>

export class AuthServiceError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "AuthServiceError"
  }
}

function mapHttpError(error: unknown, unauthorizedCode: AuthErrorCode): AuthServiceError {
  if (!(error instanceof HttpClientError)) {
    return new AuthServiceError("server", "Authentication failed unexpectedly.", error)
  }

  if (error.kind === "timeout") {
    return new AuthServiceError("timeout", "The campus did not respond in time.", error)
  }

  if (error.kind === "network") {
    return new AuthServiceError("network", "The campus could not be reached.", error)
  }

  if (error.kind === "unsupported") {
    return new AuthServiceError("unsupported", error.message, error)
  }

  if (error.kind === "http") {
    if (error.status === 401) {
      return new AuthServiceError(unauthorizedCode, "Authentication was rejected.", error)
    }

    if (error.status === 403) {
      return new AuthServiceError("access_denied", "Access to this campus was denied.", error)
    }
  }

  return new AuthServiceError("server", "The campus returned an authentication error.", error)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function parseCurrentUserProfile(value: unknown): CurrentUserProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthServiceError("invalid_response", "The current user response is invalid.")
  }

  const profile = value as CurrentUserProfileResponse

  if (
    typeof profile.id !== "number" ||
    typeof profile.username !== "string" ||
    !isNullableString(profile.firstname) ||
    !isNullableString(profile.lastname) ||
    typeof profile.fullName !== "string" ||
    typeof profile.email !== "string" ||
    typeof profile.locale !== "string" ||
    typeof profile.timezone !== "string" ||
    !Array.isArray(profile.roles) ||
    !profile.roles.every((role) => typeof role === "string")
  ) {
    throw new AuthServiceError("invalid_response", "The current user response is incomplete.")
  }

  return {
    id: profile.id,
    username: profile.username,
    firstname: profile.firstname,
    lastname: profile.lastname,
    fullName: profile.fullName,
    email: profile.email,
    locale: profile.locale,
    timezone: profile.timezone,
    roles: [...profile.roles],
  }
}

export class AuthApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async createToken(credentials: AuthCredentials): Promise<string> {
    try {
      const response = await this.httpClient.request<AuthenticationTokenResponse, AuthCredentials>({
        method: "POST",
        path: "/api/authentication_token",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: credentials,
      })

      if (typeof response.data.token !== "string" || !response.data.token.trim()) {
        throw new AuthServiceError("invalid_response", "The campus did not return a JWT.")
      }

      return response.data.token
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }

      throw mapHttpError(error, "invalid_credentials")
    }
  }

  async getCurrentUser(token: string): Promise<CurrentUserProfile> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/me",
        headers: {
          Accept: "application/ld+json",
          Authorization: `Bearer ${token}`,
        },
      })

      return parseCurrentUserProfile(response.data)
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }

      throw mapHttpError(error, "session_expired")
    }
  }
}
