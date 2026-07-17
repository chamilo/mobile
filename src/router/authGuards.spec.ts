import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { CurrentUserProfile } from "@/domain/auth/types"
import { createTestRouter } from "@/router"
import { registerAuthGuards } from "@/router/authGuards"
import type { StoredToken, TokenStorage } from "@/services/auth/TokenStorage"
import type {
  CampusProfileRepository,
  CampusRepositorySnapshot,
} from "@/services/campus/CampusProfileRepository"
import { resetAuthDependencies, setAuthDependenciesForTests } from "@/stores/auth"
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

class MemoryCampusRepository implements CampusProfileRepository {
  snapshot: CampusRepositorySnapshot = { version: 1, profiles: [], selectedCampusId: null }
  load = () => structuredClone(this.snapshot)
  save = (snapshot: CampusRepositorySnapshot) => {
    this.snapshot = structuredClone(snapshot)
  }
}

class MemoryTokenStorage implements TokenStorage {
  readonly tokens = new Map<string, StoredToken>()
  async load(campusId: string) {
    return this.tokens.get(campusId) ?? null
  }
  async save(campusId: string, token: StoredToken) {
    this.tokens.set(campusId, token)
  }
  async remove(campusId: string) {
    this.tokens.delete(campusId)
  }
}

describe("authentication route guards", () => {
  let pinia: ReturnType<typeof createPinia>
  let tokenStorage: MemoryTokenStorage

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    tokenStorage = new MemoryTokenStorage()
    setCampusProfileRepositoryForTests(new MemoryCampusRepository())
    setAuthDependenciesForTests(tokenStorage, () => ({
      createToken: async () => "unused",
      getCurrentUser: async () => profile,
    }))
  })

  afterEach(() => {
    resetAuthDependencies()
    resetCampusProfileRepository()
  })

  it("redirects protected routes to campus setup when no campus is selected", async () => {
    const router = createTestRouter()
    registerAuthGuards(router, pinia)

    await router.push("/courses")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("campuses")
  })

  it("redirects protected routes to login when the campus has no token", async () => {
    const campusStore = useCampusStore()
    campusStore.initialize()
    campusStore.addCampus({ displayName: "Local", baseUrl: "local.local" })
    const router = createTestRouter()
    registerAuthGuards(router, pinia)

    await router.push("/courses")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("login")
  })

  it("restores a valid campus session before entering protected routes", async () => {
    const campusStore = useCampusStore()
    campusStore.initialize()
    const campus = campusStore.addCampus({ displayName: "Local", baseUrl: "local.local" })

    if (!campus) {
      throw new Error("Campus setup failed in test.")
    }

    await tokenStorage.save(campus.id, { token: "jwt", expiresAt: Date.now() + 60_000 })
    const router = createTestRouter()
    registerAuthGuards(router, pinia)

    await router.push("/courses")
    await router.isReady()

    expect(router.currentRoute.value.name).toBe("courses")
  })
})
