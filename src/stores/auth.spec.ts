import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { CurrentUserProfile } from "@/domain/auth/types"
import type {
  CampusProfileRepository,
  CampusRepositorySnapshot,
} from "@/services/campus/CampusProfileRepository"
import { AuthServiceError } from "@/services/auth/AuthApiService"
import { registerBeforeCampusSessionClearListener } from "@/services/auth/AuthSessionLifecycle"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"
import type { OfflineProfileRecord } from "@/domain/offline/types"
import type { OfflineProfileRepository } from "@/services/offline/OfflineProfileRepository"
import { resetAuthDependencies, setAuthDependenciesForTests, useAuthStore } from "@/stores/auth"
import {
  resetCampusProfileRepository,
  setCampusProfileRepositoryForTests,
  useCampusStore,
} from "@/stores/campus"

const profile: CurrentUserProfile = {
  id: 7,
  username: "student",
  firstname: "Mobile",
  lastname: "Student",
  fullName: "Mobile Student",
  email: "student@example.org",
  locale: "en",
  timezone: "UTC",
  roles: ["ROLE_USER"],
}

function encode(value: object): string {
  return globalThis
    .btoa(JSON.stringify(value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function createToken(expirationSeconds: number): string {
  return `${encode({ alg: "RS256" })}.${encode({ exp: expirationSeconds })}.signature`
}

class MemoryCampusRepository implements CampusProfileRepository {
  snapshot: CampusRepositorySnapshot = { version: 1, profiles: [], selectedCampusId: null }

  load(): CampusRepositorySnapshot {
    return structuredClone(this.snapshot)
  }

  save(snapshot: CampusRepositorySnapshot): void {
    this.snapshot = structuredClone(snapshot)
  }
}

class MemoryOfflineProfileRepository implements OfflineProfileRepository {
  records = new Map<string, OfflineProfileRecord>()

  async load(campusId: string): Promise<OfflineProfileRecord | null> {
    return structuredClone(this.records.get(campusId) ?? null)
  }

  async save(campusId: string, currentProfile: CurrentUserProfile): Promise<void> {
    this.records.set(campusId, {
      version: 1,
      key: `profile:${campusId}`,
      campusId,
      userId: currentProfile.id,
      savedAt: new Date().toISOString(),
      profile: structuredClone(currentProfile),
    })
  }

  async clearCampus(campusId: string): Promise<void> {
    this.records.delete(campusId)
  }
}

class MemoryTokenStorage implements TokenStorage {
  readonly tokens = new Map<string, StoredToken>()

  async load(campusId: string): Promise<StoredToken | null> {
    return this.tokens.get(campusId) ?? null
  }

  async save(campusId: string, token: StoredToken): Promise<void> {
    this.tokens.set(campusId, token)
  }

  async remove(campusId: string): Promise<void> {
    this.tokens.delete(campusId)
  }
}

describe("auth store", () => {
  let tokenStorage: MemoryTokenStorage
  let campusRepository: MemoryCampusRepository

  beforeEach(() => {
    setActivePinia(createPinia())
    tokenStorage = new MemoryTokenStorage()
    campusRepository = new MemoryCampusRepository()
    setCampusProfileRepositoryForTests(campusRepository)
  })

  afterEach(() => {
    resetAuthDependencies()
    resetCampusProfileRepository()
  })

  function addCampus(): string {
    const campusStore = useCampusStore()
    campusStore.initialize()
    const campus = campusStore.addCampus({ displayName: "Local", baseUrl: "local.local" })

    if (!campus) {
      throw new Error("Campus setup failed in test.")
    }

    return campus.id
  }

  it("authenticates, stores the token by campus and loads the profile", async () => {
    const campusId = addCampus()
    const token = createToken(Math.floor(Date.now() / 1_000) + 3_600)
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => token,
      getCurrentUser: async () => profile,
    }))
    const authStore = useAuthStore()

    await expect(authStore.signIn({ username: "student", password: "secret" })).resolves.toBe(true)

    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.profile).toEqual(profile)
    expect((await tokenStorage.load(campusId))?.token).toBe(token)
  })

  it("maps invalid credentials without saving a password or token", async () => {
    const campusId = addCampus()
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => {
        throw new AuthServiceError("invalid_credentials", "Rejected")
      },
      getCurrentUser: async () => profile,
    }))
    const authStore = useAuthStore()

    await expect(authStore.signIn({ username: "student", password: "wrong" })).resolves.toBe(false)

    expect(authStore.errorCode).toBe("invalid_credentials")
    expect(await tokenStorage.load(campusId)).toBeNull()
  })

  it("removes the selected campus token during logout", async () => {
    const campusId = addCampus()
    const token = createToken(Math.floor(Date.now() / 1_000) + 3_600)
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => token,
      getCurrentUser: async () => profile,
    }))
    const authStore = useAuthStore()
    await authStore.signIn({ username: "student", password: "secret" })

    await authStore.signOut()

    expect(authStore.isAuthenticated).toBe(false)
    expect(authStore.profile).toBeNull()
    expect(await tokenStorage.load(campusId)).toBeNull()
  })

  it("runs authenticated cleanup before removing the campus token", async () => {
    const campusId = addCampus()
    const token = createToken(Math.floor(Date.now() / 1_000) + 3_600)
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => token,
      getCurrentUser: async () => profile,
    }))
    const authStore = useAuthStore()
    await authStore.signIn({ username: "student", password: "secret" })
    let tokenAvailableDuringCleanup = false
    const unregister = registerBeforeCampusSessionClearListener(async (campus) => {
      tokenAvailableDuringCleanup = Boolean(await tokenStorage.load(campus.id))
    })

    try {
      await authStore.signOut()
    } finally {
      unregister()
    }

    expect(tokenAvailableDuringCleanup).toBe(true)
    expect(await tokenStorage.load(campusId)).toBeNull()
  })

  it("restores a valid saved session when the campus is offline", async () => {
    const campusId = addCampus()
    const token = createToken(Math.floor(Date.now() / 1_000) + 3_600)
    const profiles = new MemoryOfflineProfileRepository()
    await tokenStorage.save(campusId, {
      token,
      expiresAt: (Math.floor(Date.now() / 1_000) + 3_600) * 1_000,
    })
    await profiles.save(campusId, profile)
    setAuthDependenciesForTests(
      tokenStorage,
      () => ({
        createToken: async () => token,
        getCurrentUser: async () => {
          throw new AuthServiceError("network", "Offline")
        },
      }),
      profiles,
    )
    const authStore = useAuthStore()

    await expect(authStore.ensureSession()).resolves.toBe(true)

    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.isOfflineSession).toBe(true)
    expect(authStore.profile).toEqual(profile)
  })

  it("rejects and removes an expired stored token", async () => {
    const campusId = addCampus()
    await tokenStorage.save(campusId, { token: createToken(1), expiresAt: 1_000 })
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => "unused",
      getCurrentUser: async () => profile,
    }))
    const authStore = useAuthStore()

    await expect(authStore.ensureSession()).resolves.toBe(false)

    expect(authStore.errorCode).toBe("session_expired")
    expect(await tokenStorage.load(campusId)).toBeNull()
  })
})
