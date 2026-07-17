import { computed, ref } from "vue"
import { defineStore } from "pinia"

import { getJwtExpiration, isTokenExpired, JwtParseError } from "@/domain/auth/jwt"
import type {
  AuthCredentials,
  AuthErrorCode,
  AuthStatus,
  CurrentUserProfile,
} from "@/domain/auth/types"
import type { CampusProfile } from "@/domain/campus/types"
import { AuthApiService, AuthServiceError } from "@/services/auth/AuthApiService"
import { createTokenStorage } from "@/services/auth/createTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"
import { createHttpClient } from "@/services/http/createHttpClient"
import { useCampusStore } from "@/stores/campus"

export type AuthApi = Pick<AuthApiService, "createToken" | "getCurrentUser">
export type AuthApiFactory = (campus: CampusProfile) => AuthApi

let tokenStorage: TokenStorage = createTokenStorage()
let authApiFactory: AuthApiFactory = (campus) => new AuthApiService(createHttpClient(campus))

export function setAuthDependenciesForTests(
  testTokenStorage: TokenStorage,
  testAuthApiFactory: AuthApiFactory,
): void {
  tokenStorage = testTokenStorage
  authApiFactory = testAuthApiFactory
}

export function resetAuthDependencies(): void {
  tokenStorage = createTokenStorage()
  authApiFactory = (campus) => new AuthApiService(createHttpClient(campus))
}

function mapAuthError(error: unknown): AuthErrorCode {
  if (error instanceof AuthServiceError) {
    return error.code
  }

  if (error instanceof JwtParseError) {
    return "invalid_response"
  }

  if (error instanceof TokenStorageError) {
    return error.kind === "unsupported" ? "unsupported" : "storage_failed"
  }

  return "server"
}

export const useAuthStore = defineStore("auth", () => {
  const status = ref<AuthStatus>("idle")
  const currentCampusId = ref<string | null>(null)
  const profile = ref<CurrentUserProfile | null>(null)
  const errorCode = ref<AuthErrorCode | null>(null)

  const isAuthenticated = computed(
    () =>
      status.value === "authenticated" && profile.value !== null && currentCampusId.value !== null,
  )

  function clearActiveState(): void {
    status.value = "idle"
    currentCampusId.value = null
    profile.value = null
    errorCode.value = null
  }

  async function signIn(credentials: AuthCredentials): Promise<boolean> {
    const campusStore = useCampusStore()
    const campus = campusStore.selectedCampus

    if (!campus) {
      clearActiveState()
      status.value = "error"
      errorCode.value = "campus_required"

      return false
    }

    status.value = "authenticating"
    errorCode.value = null
    profile.value = null
    currentCampusId.value = campus.id

    try {
      const api = authApiFactory(campus)
      const token = await api.createToken(credentials)
      const expiresAt = getJwtExpiration(token)

      if (isTokenExpired(expiresAt)) {
        throw new AuthServiceError("session_expired", "The campus returned an expired token.")
      }

      const currentUser = await api.getCurrentUser(token)

      await tokenStorage.save(campus.id, { token, expiresAt })

      profile.value = currentUser
      status.value = "authenticated"
      errorCode.value = null

      return true
    } catch (error) {
      await tokenStorage.remove(campus.id).catch(() => undefined)
      profile.value = null
      status.value = "error"
      errorCode.value = mapAuthError(error)

      return false
    }
  }

  async function ensureSession(): Promise<boolean> {
    const campusStore = useCampusStore()
    const campus = campusStore.selectedCampus

    if (!campus) {
      clearActiveState()

      return false
    }

    if (isAuthenticated.value && currentCampusId.value === campus.id) {
      return true
    }

    status.value = "restoring"
    errorCode.value = null
    profile.value = null
    currentCampusId.value = campus.id

    try {
      const storedToken = await tokenStorage.load(campus.id)

      if (!storedToken) {
        clearActiveState()

        return false
      }

      if (isTokenExpired(storedToken.expiresAt)) {
        await tokenStorage.remove(campus.id)
        status.value = "error"
        errorCode.value = "session_expired"
        currentCampusId.value = campus.id

        return false
      }

      const currentUser = await authApiFactory(campus).getCurrentUser(storedToken.token)

      profile.value = currentUser
      status.value = "authenticated"
      errorCode.value = null

      return true
    } catch (error) {
      const mappedError = mapAuthError(error)

      if (mappedError === "session_expired" || mappedError === "access_denied") {
        await tokenStorage.remove(campus.id).catch(() => undefined)
      }

      profile.value = null
      status.value = "error"
      errorCode.value = mappedError

      return false
    }
  }

  async function signOut(): Promise<void> {
    const campusId = currentCampusId.value ?? useCampusStore().selectedCampusId
    let storageError: unknown = null

    if (campusId) {
      try {
        await tokenStorage.remove(campusId)
      } catch (error) {
        storageError = error
      }
    }

    clearActiveState()

    if (storageError) {
      status.value = "error"
      errorCode.value = mapAuthError(storageError)
    }
  }

  async function clearCampusSession(campusId: string): Promise<boolean> {
    try {
      await tokenStorage.remove(campusId)

      if (currentCampusId.value === campusId) {
        clearActiveState()
      }

      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapAuthError(error)

      return false
    }
  }

  function resetActiveSession(): void {
    clearActiveState()
  }

  function clearError(): void {
    errorCode.value = null

    if (status.value === "error") {
      status.value = "idle"
    }
  }

  return {
    status,
    currentCampusId,
    profile,
    errorCode,
    isAuthenticated,
    signIn,
    ensureSession,
    signOut,
    clearCampusSession,
    resetActiveSession,
    clearError,
  }
})
