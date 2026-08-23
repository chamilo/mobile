import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { CurrentUserProfile } from "@/domain/auth/types"
import type { OfflineProfileRecord } from "@/domain/offline/types"
import type { TokenStorage, StoredToken } from "@/services/auth/TokenStorage"
import type { OfflineProfileRepository } from "@/services/offline/OfflineProfileRepository"
import type {
  CampusProfileRepository,
  CampusRepositorySnapshot,
} from "@/services/campus/CampusProfileRepository"
import { resetAuthDependencies, setAuthDependenciesForTests, useAuthStore } from "@/stores/auth"
import {
  resetCampusProfileRepository,
  setCampusProfileRepositoryForTests,
  useCampusStore,
} from "@/stores/campus"

function encode(value: object): string {
  return globalThis
    .btoa(JSON.stringify(value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function tokenWithExpiry(expirationSeconds: number, marker: string): string {
  return `${encode({ alg: "RS256", marker })}.${encode({ exp: expirationSeconds })}.signature`
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
  readonly records = new Map<string, OfflineProfileRecord>()

  async load(campusId: string): Promise<OfflineProfileRecord | null> {
    return structuredClone(this.records.get(campusId) ?? null)
  }

  async save(campusId: string, profile: CurrentUserProfile): Promise<void> {
    this.records.set(campusId, {
      version: 1,
      key: `profile:${campusId}`,
      campusId,
      userId: profile.id,
      savedAt: new Date().toISOString(),
      profile: structuredClone(profile),
    })
  }

  async clearCampus(campusId: string): Promise<void> {
    this.records.delete(campusId)
  }
}

const firstUser: CurrentUserProfile = {
  id: 7,
  username: "first",
  firstname: "First",
  lastname: "Student",
  fullName: "First Student",
  email: "first@example.org",
  locale: "en",
  timezone: "UTC",
  roles: ["ROLE_USER"],
}

const secondUser: CurrentUserProfile = {
  ...firstUser,
  id: 8,
  username: "second",
  firstname: "Second",
  fullName: "Second Student",
  email: "second@example.org",
}

describe("auth relogin regression", () => {
  let tokenStorage: MemoryTokenStorage

  beforeEach(() => {
    setActivePinia(createPinia())
    tokenStorage = new MemoryTokenStorage()
    setCampusProfileRepositoryForTests(new MemoryCampusRepository())
  })

  afterEach(() => {
    resetAuthDependencies()
    resetCampusProfileRepository()
  })

  it("uses a fresh token and profile after logout and a second login on the same campus", async () => {
    const campusStore = useCampusStore()
    campusStore.initialize()
    const campus = campusStore.addCampus({ displayName: "Testing", baseUrl: "testing.example.org" })
    if (!campus) throw new Error("Campus setup failed in test.")

    const profiles = new MemoryOfflineProfileRepository()
    let activeProfile = firstUser
    let tokenNumber = 0

    setAuthDependenciesForTests(
      tokenStorage,
      () => ({
        createToken: async () => {
          tokenNumber += 1
          return tokenWithExpiry(Math.floor(Date.now() / 1_000) + 3_600, String(tokenNumber))
        },
        getCurrentUser: async () => activeProfile,
      }),
      profiles,
    )

    const authStore = useAuthStore()

    await expect(authStore.signIn({ username: "first", password: "secret" })).resolves.toBe(true)
    const firstToken = (await tokenStorage.load(campus.id))?.token
    expect(authStore.profile?.id).toBe(firstUser.id)

    await authStore.signOut()
    expect(authStore.isAuthenticated).toBe(false)
    expect(await tokenStorage.load(campus.id)).toBeNull()

    activeProfile = secondUser
    await expect(authStore.signIn({ username: "second", password: "secret" })).resolves.toBe(true)

    const secondToken = (await tokenStorage.load(campus.id))?.token
    expect(secondToken).toBeTruthy()
    expect(secondToken).not.toBe(firstToken)
    expect(authStore.profile?.id).toBe(secondUser.id)
    expect(authStore.errorCode).toBeNull()
    expect(authStore.isAuthenticated).toBe(true)
  })
})
