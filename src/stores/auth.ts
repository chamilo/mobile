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
import {
  notifyActiveCampusSessionReset,
  notifyAuthenticatedCampusSession,
  notifyBeforeCampusSessionClear,
} from "@/services/auth/AuthSessionLifecycle"
import { clearCampusSessionData } from "@/services/auth/CampusSessionDataCleaner"
import { createTokenStorage } from "@/services/auth/createTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"
import { TokenStorageError } from "@/services/auth/TokenStorage"
import { createHttpClient } from "@/services/http/createHttpClient"
import {
  clearOfflineSessionUser,
  setOfflineSessionUser,
} from "@/services/offline/OfflineSessionContext"
import {
  offlineProfileRepository,
  type OfflineProfileRepository,
} from "@/services/offline/OfflineProfileRepository"
import { useCampusStore } from "@/stores/campus"

export type AuthApi = Pick<AuthApiService, "createToken" | "getCurrentUser">
export type AuthApiFactory = (campus: CampusProfile) => AuthApi
export type AuthSessionMode = "online" | "offline" | null

let tokenStorage: TokenStorage = createTokenStorage()
let authApiFactory: AuthApiFactory = (campus) => new AuthApiService(createHttpClient(campus))
let profileRepository: OfflineProfileRepository = offlineProfileRepository

export function setAuthDependenciesForTests(
  testTokenStorage: TokenStorage,
  testAuthApiFactory: AuthApiFactory,
  testProfileRepository: OfflineProfileRepository = offlineProfileRepository,
): void {
  tokenStorage = testTokenStorage
  authApiFactory = testAuthApiFactory
  profileRepository = testProfileRepository
}

export function resetAuthDependencies(): void {
  tokenStorage = createTokenStorage()
  authApiFactory = (campus) => new AuthApiService(createHttpClient(campus))
  profileRepository = offlineProfileRepository
}

function mapAuthError(error: unknown): AuthErrorCode {
  if (error instanceof AuthServiceError) return error.code
  if (error instanceof JwtParseError) return "invalid_response"
  if (error instanceof TokenStorageError) {
    return error.kind === "unsupported" ? "unsupported" : "storage_failed"
  }

  return "server"
}

function canRestoreOffline(errorCode: AuthErrorCode): boolean {
  return errorCode === "network" || errorCode === "timeout"
}

export const useAuthStore = defineStore("auth", () => {
  const status = ref<AuthStatus>("idle")
  const currentCampusId = ref<string | null>(null)
  const profile = ref<CurrentUserProfile | null>(null)
  const sessionMode = ref<AuthSessionMode>(null)
  const errorCode = ref<AuthErrorCode | null>(null)

  const isAuthenticated = computed(
    () =>
      status.value === "authenticated" && profile.value !== null && currentCampusId.value !== null,
  )
  const isOfflineSession = computed(() => isAuthenticated.value && sessionMode.value === "offline")

  function clearActiveState(): void {
    const previousCampusId = currentCampusId.value
    status.value = "idle"
    currentCampusId.value = null
    profile.value = null
    sessionMode.value = null
    errorCode.value = null

    if (previousCampusId) {
      clearOfflineSessionUser(previousCampusId)
    }
  }

  async function cacheProfile(campusId: string, currentUser: CurrentUserProfile): Promise<void> {
    await profileRepository.save(campusId, currentUser).catch(() => undefined)
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
    sessionMode.value = null
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
      await cacheProfile(campus.id, currentUser)

      profile.value = currentUser
      setOfflineSessionUser(campus.id, currentUser.id)
      sessionMode.value = "online"
      status.value = "authenticated"
      errorCode.value = null
      void notifyAuthenticatedCampusSession(campus, currentUser.id)

      return true
    } catch (error) {
      await tokenStorage.remove(campus.id).catch(() => undefined)
      profile.value = null
      clearOfflineSessionUser(campus.id)
      sessionMode.value = null
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

    if (isAuthenticated.value && currentCampusId.value === campus.id) return true

    status.value = "restoring"
    errorCode.value = null
    profile.value = null
    sessionMode.value = null
    currentCampusId.value = campus.id

    try {
      const storedToken = await tokenStorage.load(campus.id)

      if (!storedToken) {
        clearActiveState()
        return false
      }

      if (isTokenExpired(storedToken.expiresAt)) {
        await notifyBeforeCampusSessionClear(campus)
        await tokenStorage.remove(campus.id)
        await clearCampusSessionData(campus.id).catch(() => undefined)
        status.value = "error"
        errorCode.value = "session_expired"
        currentCampusId.value = campus.id
        return false
      }

      try {
        const currentUser = await authApiFactory(campus).getCurrentUser(storedToken.token)
        await cacheProfile(campus.id, currentUser)

        profile.value = currentUser
        setOfflineSessionUser(campus.id, currentUser.id)
        sessionMode.value = "online"
        status.value = "authenticated"
        errorCode.value = null
        void notifyAuthenticatedCampusSession(campus, currentUser.id)
        return true
      } catch (error) {
        const mappedError = mapAuthError(error)

        if (canRestoreOffline(mappedError)) {
          const cachedProfile = await profileRepository.load(campus.id).catch(() => null)

          if (cachedProfile) {
            profile.value = cachedProfile.profile
            setOfflineSessionUser(campus.id, cachedProfile.profile.id)
            sessionMode.value = "offline"
            status.value = "authenticated"
            errorCode.value = null
            return true
          }
        }

        throw error
      }
    } catch (error) {
      const mappedError = mapAuthError(error)

      if (mappedError === "session_expired" || mappedError === "access_denied") {
        await notifyBeforeCampusSessionClear(campus)
        await tokenStorage.remove(campus.id).catch(() => undefined)
        await clearCampusSessionData(campus.id).catch(() => undefined)
      }

      profile.value = null
      clearOfflineSessionUser(campus.id)
      sessionMode.value = null
      status.value = "error"
      errorCode.value = mappedError
      return false
    }
  }

  async function signOut(): Promise<void> {
    const campusStore = useCampusStore()
    const campusId = currentCampusId.value ?? campusStore.selectedCampusId
    const campus = campusStore.profiles.find((candidate) => candidate.id === campusId)
    let storageError: unknown = null

    if (campusId) {
      try {
        if (campus) await notifyBeforeCampusSessionClear(campus)
        await tokenStorage.remove(campusId)
        await clearCampusSessionData(campusId)
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
      const campus = useCampusStore().profiles.find((candidate) => candidate.id === campusId)

      if (campus) await notifyBeforeCampusSessionClear(campus)
      await tokenStorage.remove(campusId)
      await clearCampusSessionData(campusId)

      if (currentCampusId.value === campusId) clearActiveState()
      return true
    } catch (error) {
      status.value = "error"
      errorCode.value = mapAuthError(error)
      return false
    }
  }

  function resetActiveSession(): void {
    clearActiveState()
    void notifyActiveCampusSessionReset()
  }

  function clearError(): void {
    errorCode.value = null
    if (status.value === "error") status.value = "idle"
  }

  return {
    status,
    currentCampusId,
    profile,
    sessionMode,
    errorCode,
    isAuthenticated,
    isOfflineSession,
    signIn,
    ensureSession,
    signOut,
    clearCampusSession,
    resetActiveSession,
    clearError,
  }
})
