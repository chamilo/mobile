import { computed, ref } from "vue"
import { defineStore } from "pinia"
import type { Router } from "vue-router"

import type { CampusProfile } from "@/domain/campus/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import {
  browserPushInstallationRepository,
  type PushInstallationRepository,
  PushInstallationStorageError,
} from "@/services/pushNotifications/BrowserPushInstallationRepository"
import {
  MobilePushInstallationApiService,
  MobilePushInstallationResponseError,
} from "@/services/pushNotifications/MobilePushInstallationApiService"
import { nativePushNotificationGateway } from "@/services/pushNotifications/NativePushNotificationGateway"
import type {
  PushNotificationGateway,
  PushNotificationAction,
  PushNotificationListenerHandle,
  PushPermissionState,
} from "@/services/pushNotifications/PushNotificationGateway"

export type PushNotificationStatus =
  | "idle"
  | "checking"
  | "prompt"
  | "denied"
  | "registering"
  | "registered"
  | "error"
  | "unsupported"

export type PushNotificationErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "network"
  | "timeout"
  | "invalid_response"
  | "storage_failed"
  | "registration_failed"
  | "server"

export interface PushInstallationApi {
  register(installationId: string, token: string): Promise<unknown>
  remove(installationId: string): Promise<void>
}

export type PushInstallationApiFactory = (campus: CampusProfile) => PushInstallationApi

interface ActivePushSession {
  campus: CampusProfile
  userId: number
}

interface PendingMessageAction {
  messageId: number
  installationId: string
}

let gateway: PushNotificationGateway = nativePushNotificationGateway
let repository: PushInstallationRepository = browserPushInstallationRepository
let apiFactory: PushInstallationApiFactory = (campus) =>
  new MobilePushInstallationApiService(createAuthenticatedHttpClient(campus))

export function setPushNotificationDependenciesForTests(
  testGateway: PushNotificationGateway,
  testRepository: PushInstallationRepository,
  testApiFactory: PushInstallationApiFactory,
): void {
  gateway = testGateway
  repository = testRepository
  apiFactory = testApiFactory
}

export function resetPushNotificationDependencies(): void {
  gateway = nativePushNotificationGateway
  repository = browserPushInstallationRepository
  apiFactory = (campus) =>
    new MobilePushInstallationApiService(createAuthenticatedHttpClient(campus))
}

function mapError(error: unknown): PushNotificationErrorCode {
  if (error instanceof PushInstallationStorageError) {
    return "storage_failed"
  }

  if (error instanceof MobilePushInstallationResponseError) {
    return "invalid_response"
  }

  if (error instanceof HttpClientError) {
    if (error.kind === "authentication") {
      return "session_required"
    }

    if (error.kind === "network") {
      return "network"
    }

    if (error.kind === "timeout") {
      return "timeout"
    }

    if (error.kind === "http" && error.status === 401) {
      return "session_expired"
    }

    if (error.kind === "http" && error.status === 403) {
      return "access_denied"
    }

    return "server"
  }

  return "registration_failed"
}

export const usePushNotificationsStore = defineStore("pushNotifications", () => {
  const available = ref(false)
  const initialized = ref(false)
  const status = ref<PushNotificationStatus>("idle")
  const permission = ref<PushPermissionState | null>(null)
  const errorCode = ref<PushNotificationErrorCode | null>(null)
  const activeCampusId = ref<string | null>(null)
  const listenerHandles: PushNotificationListenerHandle[] = []

  let activeSession: ActivePushSession | null = null
  let router: Router | null = null
  let initializationPromise: Promise<void> | null = null
  let pendingRegistration: Promise<void> | null = null
  let pendingMessageAction: PendingMessageAction | null = null

  const busy = computed(() => status.value === "checking" || status.value === "registering")
  const canEnable = computed(
    () => available.value && (status.value === "prompt" || status.value === "error"),
  )

  async function registerToken(token: string): Promise<void> {
    const session = activeSession

    if (!session || !token.trim()) {
      return
    }

    status.value = "registering"
    errorCode.value = null

    try {
      const installation = repository.prepare(session.campus.id, session.userId)
      await apiFactory(session.campus).register(installation.installationId, token)

      if (
        activeSession?.campus.id !== session.campus.id ||
        activeSession.userId !== session.userId
      ) {
        return
      }

      repository.markRegistered(session.campus.id, session.userId)
      status.value = "registered"
    } catch (error) {
      if (
        activeSession?.campus.id === session.campus.id &&
        activeSession.userId === session.userId
      ) {
        status.value = "error"
        errorCode.value = mapError(error)
      }
    }
  }

  async function handleToken(token: string): Promise<void> {
    const registration = registerToken(token)
    pendingRegistration = registration

    try {
      await registration
    } finally {
      if (pendingRegistration === registration) {
        pendingRegistration = null
      }
    }
  }

  async function initialize(nativeRouter: Router): Promise<void> {
    if (initializationPromise) {
      return initializationPromise
    }

    router = nativeRouter
    initializationPromise = (async () => {
      available.value = gateway.isAvailable()

      if (!available.value) {
        status.value = "unsupported"
        initialized.value = true
        return
      }

      listenerHandles.push(
        await gateway.addRegistrationListener((token) => handleToken(token)),
        await gateway.addRegistrationErrorListener(() => {
          if (!activeSession) {
            return
          }

          status.value = "error"
          errorCode.value = "registration_failed"
        }),
        await gateway.addActionListener(handleNotificationAction),
      )
      initialized.value = true
    })().catch((error) => {
      status.value = "error"
      errorCode.value = mapError(error)
      initialized.value = true
    })

    return initializationPromise
  }

  function parseMessageAction(action: PushNotificationAction): PendingMessageAction | null {
    if (action.data.type !== "message") {
      return null
    }

    const messageId =
      typeof action.data.messageId === "number"
        ? action.data.messageId
        : Number.parseInt(String(action.data.messageId ?? ""), 10)
    const installationId =
      typeof action.data.installationId === "string" ? action.data.installationId.trim() : ""

    if (!Number.isInteger(messageId) || messageId <= 0 || !installationId) {
      return null
    }

    return { messageId, installationId }
  }

  async function openMessageAction(action: PendingMessageAction): Promise<boolean> {
    const session = activeSession

    if (!session || !router) {
      return false
    }

    const registration = repository.load(session.campus.id)

    if (
      !registration ||
      registration.userId !== session.userId ||
      registration.installationId !== action.installationId
    ) {
      return false
    }

    await router.push({
      name: "message-detail",
      params: { messageId: action.messageId },
    })

    return true
  }

  async function handleNotificationAction(action: PushNotificationAction): Promise<void> {
    const messageAction = parseMessageAction(action)

    if (!messageAction) {
      return
    }

    if (!(await openMessageAction(messageAction))) {
      pendingMessageAction = messageAction
    }
  }

  async function registerWithGrantedPermission(): Promise<void> {
    status.value = "registering"
    errorCode.value = null

    try {
      await gateway.register()
    } catch (error) {
      status.value = "error"
      errorCode.value = mapError(error)
    }
  }

  async function activateSession(campus: CampusProfile, userId: number): Promise<void> {
    activeSession = { campus, userId }
    activeCampusId.value = campus.id

    if (initializationPromise) {
      await initializationPromise
    }

    if (pendingMessageAction && (await openMessageAction(pendingMessageAction))) {
      pendingMessageAction = null
    }

    if (!available.value) {
      status.value = "unsupported"
      return
    }

    status.value = "checking"
    errorCode.value = null

    try {
      permission.value = await gateway.checkPermissions()
      status.value = permission.value === "denied" ? "denied" : "prompt"
    } catch (error) {
      status.value = "error"
      errorCode.value = mapError(error)
    }
  }

  async function enable(): Promise<void> {
    if (!activeSession || !available.value) {
      return
    }

    status.value = "checking"
    errorCode.value = null

    try {
      let nextPermission = await gateway.checkPermissions()

      if (nextPermission === "prompt" || nextPermission === "prompt-with-rationale") {
        nextPermission = await gateway.requestPermissions()
      }

      permission.value = nextPermission

      if (nextPermission !== "granted") {
        status.value = "denied"
        return
      }

      await registerWithGrantedPermission()
    } catch (error) {
      status.value = "error"
      errorCode.value = mapError(error)
    }
  }

  async function deactivateSession(campus: CampusProfile): Promise<void> {
    const deactivatesCurrentSession = activeSession?.campus.id === campus.id

    if (deactivatesCurrentSession) {
      activeSession = null
      activeCampusId.value = null
    }

    try {
      await pendingRegistration
      const installation = repository.load(campus.id)

      if (installation) {
        try {
          await apiFactory(campus).remove(installation.installationId)
        } catch {
          await gateway.unregister().catch(() => undefined)
        }

        repository.clearRegistration(campus.id)
      }
    } catch {
      await gateway.unregister().catch(() => undefined)
    } finally {
      if (deactivatesCurrentSession) {
        pendingMessageAction = null
        permission.value = null
        errorCode.value = null
        status.value = available.value ? "idle" : "unsupported"
      }
    }
  }

  function suspendActiveSession(): void {
    activeSession = null
    activeCampusId.value = null
    permission.value = null
    errorCode.value = null
    pendingMessageAction = null
    status.value = available.value ? "idle" : "unsupported"
  }

  async function dispose(): Promise<void> {
    await Promise.all(listenerHandles.splice(0).map((handle) => handle.remove()))
    initializationPromise = null
    initialized.value = false
    router = null
  }

  return {
    available,
    initialized,
    status,
    permission,
    errorCode,
    activeCampusId,
    busy,
    canEnable,
    initialize,
    activateSession,
    enable,
    deactivateSession,
    suspendActiveSession,
    dispose,
  }
})
