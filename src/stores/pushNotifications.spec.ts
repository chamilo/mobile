import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Router } from "vue-router"

import type { CampusProfile } from "@/domain/campus/types"
import type {
  PushInstallationRegistration,
  PushInstallationRepository,
} from "@/services/pushNotifications/BrowserPushInstallationRepository"
import type {
  PushNotificationAction,
  PushNotificationGateway,
  PushNotificationListenerHandle,
  PushNotificationRegistrationError,
} from "@/services/pushNotifications/PushNotificationGateway"
import {
  resetPushNotificationDependencies,
  setPushNotificationDependenciesForTests,
  usePushNotificationsStore,
} from "@/stores/pushNotifications"

const campus: CampusProfile = {
  id: "campus-one",
  displayName: "Campus One",
  baseUrl: "https://campus.example.org",
  allowInsecureHttp: false,
  compatibilityStatus: "compatible",
  compatibilityCheckedAt: null,
  createdAt: "2026-07-26T10:00:00.000Z",
  updatedAt: "2026-07-26T10:00:00.000Z",
  lastUsedAt: "2026-07-26T10:00:00.000Z",
}

class MockPushNotificationGateway implements PushNotificationGateway {
  permission: "prompt" | "prompt-with-rationale" | "granted" | "denied" = "granted"
  registerCalls = 0
  unregisterCalls = 0
  registrationListener: ((token: string) => void | Promise<void>) | null = null
  registrationErrorListener:
    | ((error: PushNotificationRegistrationError) => void | Promise<void>)
    | null = null
  actionListener: ((action: PushNotificationAction) => void | Promise<void>) | null = null

  isAvailable(): boolean {
    return true
  }

  async checkPermissions() {
    return this.permission
  }

  async requestPermissions() {
    return this.permission
  }

  async register(): Promise<void> {
    this.registerCalls += 1
  }

  async unregister(): Promise<void> {
    this.unregisterCalls += 1
  }

  async addRegistrationListener(
    listener: (token: string) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    this.registrationListener = listener
    return { remove: async () => undefined }
  }

  async addRegistrationErrorListener(
    listener: (error: PushNotificationRegistrationError) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    this.registrationErrorListener = listener
    return { remove: async () => undefined }
  }

  async addActionListener(
    listener: (action: PushNotificationAction) => void | Promise<void>,
  ): Promise<PushNotificationListenerHandle> {
    this.actionListener = listener
    return { remove: async () => undefined }
  }

  async emitToken(token: string): Promise<void> {
    await this.registrationListener?.(token)
  }

  async emitAction(data: Record<string, unknown> = {}): Promise<void> {
    await this.actionListener?.({ actionId: "tap", data })
  }
}

class MemoryPushInstallationRepository implements PushInstallationRepository {
  state: PushInstallationRegistration | null = null
  cleared = false

  load(): PushInstallationRegistration | null {
    return this.state
  }

  prepare(_campusId: string, userId: number): PushInstallationRegistration {
    this.state = {
      installationId: "11111111-1111-4111-8111-111111111111",
      userId,
      registeredAt: null,
    }

    return this.state
  }

  markRegistered(_campusId: string, userId: number): void {
    if (this.state?.userId === userId) {
      this.state = { ...this.state, registeredAt: "2026-07-26T10:00:00.000Z" }
    }
  }

  clearRegistration(): void {
    this.state = null
    this.cleared = true
  }
}

describe("push notifications store", () => {
  let gateway: MockPushNotificationGateway
  let repository: MemoryPushInstallationRepository
  let register: ReturnType<typeof vi.fn>
  let remove: ReturnType<typeof vi.fn>
  let router: Router

  beforeEach(() => {
    setActivePinia(createPinia())
    gateway = new MockPushNotificationGateway()
    repository = new MemoryPushInstallationRepository()
    register = vi.fn().mockResolvedValue({})
    remove = vi.fn().mockResolvedValue(undefined)
    router = {
      push: vi.fn().mockResolvedValue(undefined),
    } as unknown as Router
    setPushNotificationDependenciesForTests(gateway, repository, () => ({
      register,
      remove,
    }))
  })

  afterEach(() => {
    resetPushNotificationDependencies()
  })

  it("registers token rotation for the active campus and user", async () => {
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)

    expect(gateway.registerCalls).toBe(0)
    expect(store.status).toBe("prompt")

    await store.enable()
    expect(gateway.registerCalls).toBe(1)

    await gateway.emitToken("fcm-token")

    expect(register).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "fcm-token")
    expect(repository.state).toMatchObject({
      userId: 7,
      registeredAt: expect.any(String),
    })
    expect(store.status).toBe("registered")
  })

  it("opens the matching message only for the active campus installation", async () => {
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)
    await store.enable()
    await gateway.emitToken("fcm-token")

    await gateway.emitAction({
      type: "message",
      messageId: "42",
      installationId: "11111111-1111-4111-8111-111111111111",
    })

    expect(router.push).toHaveBeenCalledWith({
      name: "message-detail",
      params: { messageId: 42 },
    })
  })

  it("ignores message notification data from another installation", async () => {
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)
    await store.enable()
    await gateway.emitToken("fcm-token")

    await gateway.emitAction({
      type: "message",
      messageId: "42",
      installationId: "22222222-2222-4222-8222-222222222222",
    })

    expect(router.push).not.toHaveBeenCalled()
  })

  it("removes the backend installation before clearing local registration", async () => {
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)
    await store.enable()
    await gateway.emitToken("fcm-token")

    await store.deactivateSession(campus)

    expect(remove).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
    expect(repository.cleared).toBe(true)
    expect(store.activeCampusId).toBeNull()
  })

  it("waits for an in-flight registration before logout cleanup", async () => {
    let finishRegistration: (() => void) | null = null
    register.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRegistration = resolve
        }),
    )
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)
    await store.enable()

    const tokenRegistration = gateway.emitToken("fcm-token")
    await Promise.resolve()
    const cleanup = store.deactivateSession(campus)

    expect(remove).not.toHaveBeenCalled()

    finishRegistration?.()
    await tokenRegistration
    await cleanup

    expect(remove).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
    expect(store.activeCampusId).toBeNull()
  })

  it("does not register when Android notification permission is denied", async () => {
    gateway.permission = "denied"
    const store = usePushNotificationsStore()
    await store.initialize(router)
    await store.activateSession(campus, 7)

    expect(gateway.registerCalls).toBe(0)
    expect(store.status).toBe("denied")
  })
})
