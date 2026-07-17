export interface AuthCredentials {
  username: string
  password: string
}

export interface CurrentUserProfile {
  id: number
  username: string
  firstname: string | null
  lastname: string | null
  fullName: string
  email: string
  locale: string
  timezone: string
  roles: string[]
}

export type AuthStatus = "idle" | "authenticating" | "restoring" | "authenticated" | "error"

export type AuthErrorCode =
  | "campus_required"
  | "invalid_credentials"
  | "access_denied"
  | "session_expired"
  | "network"
  | "timeout"
  | "server"
  | "invalid_response"
  | "storage_failed"
  | "unsupported"
