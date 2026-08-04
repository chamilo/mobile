import { computed, onScopeDispose, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusProfile } from "@/domain/campus/types"
import type {
  MessageBox,
  MessageListFilters,
  MessageWriteInput,
  MobileMessage,
  MobileMessageRecipient,
} from "@/domain/messages/types"
import { registerCampusSessionDataCleaner } from "@/services/auth/CampusSessionDataCleaner"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  MessagesApiService,
  MessagesServiceError,
  type MessagesErrorCode,
} from "@/services/messages/MessagesApiService"
import {
  isOfflineNow,
  isUncertainDeliveryError,
  temporaryOfflineId,
} from "@/services/offline/OfflineWriteSupport"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type MessagesStatus = "idle" | "loading" | "ready" | "error"
export type MessagesStoreErrorCode =
  | MessagesErrorCode
  | "campus_required"
  | "offline"
  | "validation"

export type MessagesApi = Pick<
  MessagesApiService,
  "getList" | "getDetail" | "markRead" | "setStarred" | "remove" | "send" | "searchRecipients"
>
export type MessagesApiFactory = (campus: CampusProfile) => MessagesApi

let apiFactory: MessagesApiFactory = (campus) =>
  new MessagesApiService(createAuthenticatedHttpClient(campus))

export function setMessagesApiFactoryForTests(factory: MessagesApiFactory): void {
  apiFactory = factory
}

export function resetMessagesApiFactory(): void {
  apiFactory = (campus) => new MessagesApiService(createAuthenticatedHttpClient(campus))
}

function mapError(error: unknown): MessagesStoreErrorCode {
  return error instanceof MessagesServiceError ? error.code : "server"
}

export const useMessagesStore = defineStore("messages", () => {
  const listStatus = ref<MessagesStatus>("idle")
  const detailStatus = ref<MessagesStatus>("idle")
  const mutationStatus = ref<MessagesStatus>("idle")
  const recipientStatus = ref<MessagesStatus>("idle")
  const currentCampusId = ref<string | null>(null)
  const currentUserId = ref<number | null>(null)
  const currentBox = ref<MessageBox>("inbox")
  const items = ref<MobileMessage[]>([])
  const selectedMessage = ref<MobileMessage | null>(null)
  const recipients = ref<MobileMessageRecipient[]>([])
  const errorCode = ref<MessagesStoreErrorCode | null>(null)

  const unreadCount = computed(
    () => items.value.filter((item) => item.box === "inbox" && !item.read).length,
  )

  function reset(): void {
    listStatus.value = "idle"
    detailStatus.value = "idle"
    mutationStatus.value = "idle"
    recipientStatus.value = "idle"
    currentCampusId.value = null
    currentUserId.value = null
    currentBox.value = "inbox"
    items.value = []
    selectedMessage.value = null
    recipients.value = []
    errorCode.value = null
  }

  function service(): MessagesApi | null {
    const campus = useCampusStore().selectedCampus
    const profile = useAuthStore().profile

    if (!campus) {
      errorCode.value = "campus_required"
      return null
    }

    if (!profile) {
      errorCode.value = "session_required"
      return null
    }

    if (currentCampusId.value !== campus.id || currentUserId.value !== profile.id) {
      reset()
      currentCampusId.value = campus.id
      currentUserId.value = profile.id
    }

    return apiFactory(campus)
  }

  async function queueMessageWrite(input: {
    category: "message_send" | "message_read" | "message_star" | "message_delete"
    request: import("@/services/http/HttpClient").HttpRequest
    description: string
    dedupeKey?: string
    uncertainDelivery?: boolean
  }): Promise<boolean> {
    return useOfflineSyncStore().enqueueHttpWrite(input)
  }

  async function loadList(
    box: MessageBox = currentBox.value,
    filters: MessageListFilters = {},
  ): Promise<boolean> {
    const api = service()

    if (!api) {
      listStatus.value = "error"
      return false
    }

    currentBox.value = box
    listStatus.value = "loading"
    errorCode.value = null

    try {
      items.value = await api.getList(box, filters)
      listStatus.value = "ready"
      return true
    } catch (error) {
      listStatus.value = "error"
      errorCode.value = mapError(error)
      return false
    }
  }

  async function loadDetail(messageId: number): Promise<boolean> {
    const api = service()

    if (!api) {
      detailStatus.value = "error"
      return false
    }

    detailStatus.value = "loading"
    selectedMessage.value = null
    errorCode.value = null

    try {
      let message = await api.getDetail(messageId)

      if (message.box === "inbox" && !message.read) {
        if (isOfflineNow()) {
          const queued = await queueMessageWrite({
            category: "message_read",
            description: `Mark message ${messageId} as read`,
            dedupeKey: `message:${messageId}:read`,
            request: {
              method: "POST",
              path: `/api/mobile_messages/${messageId}/read`,
              headers: {
                Accept: "application/ld+json",
                "Content-Type": "application/ld+json",
              },
            },
          })
          if (queued) message = { ...message, read: true }
        } else {
          try {
            message = await api.markRead(messageId)
          } catch (error) {
            if (isUncertainDeliveryError(error)) {
              await queueMessageWrite({
                category: "message_read",
                description: `Mark message ${messageId} as read`,
                dedupeKey: `message:${messageId}:read`,
                uncertainDelivery: true,
                request: {
                  method: "POST",
                  path: `/api/mobile_messages/${messageId}/read`,
                  headers: {
                    Accept: "application/ld+json",
                    "Content-Type": "application/ld+json",
                  },
                },
              })
            } else {
              throw error
            }
          }
        }
      }

      selectedMessage.value = message
      detailStatus.value = "ready"
      replaceItem(message)
      return true
    } catch (error) {
      detailStatus.value = "error"
      errorCode.value = mapError(error)
      return false
    }
  }

  async function setStarred(message: MobileMessage, starred: boolean): Promise<boolean> {
    const api = service()

    if (!api) {
      return false
    }

    mutationStatus.value = "loading"
    errorCode.value = null

    const queueStar = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await queueMessageWrite({
        category: "message_star",
        description: `${starred ? "Star" : "Unstar"} message ${message.id}`,
        dedupeKey: `message:${message.id}:star`,
        uncertainDelivery,
        request: {
          method: "POST",
          path: `/api/mobile_messages/${message.id}/star`,
          body: { starred },
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
        },
      })
      if (queued && !uncertainDelivery) {
        const updated = { ...message, starred }
        replaceItem(updated)
        if (selectedMessage.value?.id === updated.id) selectedMessage.value = updated
        mutationStatus.value = "ready"
      }
      return queued && !uncertainDelivery
    }

    if (isOfflineNow()) return queueStar()

    try {
      const updated = await api.setStarred(message.id, starred)
      replaceItem(updated)
      selectedMessage.value =
        selectedMessage.value?.id === updated.id ? updated : selectedMessage.value
      mutationStatus.value = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueStar(true)
      mutationStatus.value = "error"
      errorCode.value = mapError(error)
      return false
    }
  }

  async function remove(messageId: number): Promise<boolean> {
    const api = service()

    if (!api) {
      return false
    }

    mutationStatus.value = "loading"
    errorCode.value = null

    const applyLocalRemoval = (): void => {
      items.value = items.value.filter((item) => item.id !== messageId)
      if (selectedMessage.value?.id === messageId) selectedMessage.value = null
    }
    const queueRemoval = async (uncertainDelivery = false): Promise<boolean> => {
      const queued = await queueMessageWrite({
        category: "message_delete",
        description: `Delete message ${messageId}`,
        dedupeKey: `message:${messageId}:delete`,
        uncertainDelivery,
        request: {
          method: "DELETE",
          path: `/api/mobile_messages/${messageId}`,
          headers: { Accept: "application/ld+json" },
        },
      })
      if (queued && !uncertainDelivery) {
        applyLocalRemoval()
        mutationStatus.value = "ready"
      }
      return queued && !uncertainDelivery
    }

    if (isOfflineNow()) return queueRemoval()

    try {
      await api.remove(messageId)
      applyLocalRemoval()
      mutationStatus.value = "ready"
      return true
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueRemoval(true)
      mutationStatus.value = "error"
      errorCode.value = mapError(error)
      return false
    }
  }

  async function send(input: MessageWriteInput): Promise<MobileMessage | null> {
    const api = service()
    const title = input.title.trim()
    const content = input.content.trim()

    if (!api) {
      return null
    }

    if (!Number.isInteger(input.recipientId) || input.recipientId <= 0 || !title || !content) {
      errorCode.value = "validation"
      return null
    }

    mutationStatus.value = "loading"
    errorCode.value = null

    const normalizedInput = { ...input, title, content }
    const queueSend = async (uncertainDelivery = false): Promise<MobileMessage | null> => {
      const queued = await queueMessageWrite({
        category: "message_send",
        description: title,
        uncertainDelivery,
        request: {
          method: "POST",
          path: "/api/mobile_messages",
          body: normalizedInput,
          headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
          },
        },
      })
      if (!queued || uncertainDelivery) return null

      const profile = useAuthStore().profile
      const recipient = recipients.value.find(({ id }) => id === input.recipientId)
      const message: MobileMessage = {
        id: temporaryOfflineId(),
        box: "sent",
        title,
        preview: content.slice(0, 160),
        content,
        sendDate: new Date().toISOString(),
        read: true,
        starred: false,
        attachmentCount: 0,
        senderId: profile?.id ?? 0,
        senderUsername: profile?.username ?? "",
        senderName: profile?.fullName ?? "",
        recipientIds: [input.recipientId],
        recipientNames: [recipient?.fullName ?? String(input.recipientId)],
        parentId: input.parentId ?? null,
      }
      mutationStatus.value = "ready"
      return message
    }

    if (isOfflineNow()) return queueSend()

    try {
      const message = await api.send(normalizedInput)
      mutationStatus.value = "ready"
      return message
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueSend(true)
      mutationStatus.value = "error"
      errorCode.value = mapError(error)
      return null
    }
  }

  async function searchRecipients(query: string): Promise<boolean> {
    const api = service()
    const normalizedQuery = query.trim()

    if (!api || normalizedQuery.length < 2) {
      recipients.value = []
      recipientStatus.value = "idle"
      return false
    }

    recipientStatus.value = "loading"
    errorCode.value = null

    try {
      recipients.value = await api.searchRecipients(normalizedQuery)
      recipientStatus.value = "ready"
      return true
    } catch (error) {
      recipients.value = []
      recipientStatus.value = "error"
      errorCode.value = mapError(error)
      return false
    }
  }

  function clearDetail(): void {
    selectedMessage.value = null
    detailStatus.value = "idle"
    errorCode.value = null
  }

  function clearRecipients(): void {
    recipients.value = []
    recipientStatus.value = "idle"
  }

  function replaceItem(message: MobileMessage): void {
    const index = items.value.findIndex((item) => item.id === message.id)

    if (index >= 0) {
      items.value.splice(index, 1, message)
    }
  }

  const unregisterSessionCleaner = registerCampusSessionDataCleaner((campusId) => {
    if (currentCampusId.value === campusId) {
      reset()
    }
  })
  onScopeDispose(unregisterSessionCleaner)

  return {
    listStatus,
    detailStatus,
    mutationStatus,
    recipientStatus,
    currentBox,
    items,
    selectedMessage,
    recipients,
    errorCode,
    unreadCount,
    loadList,
    loadDetail,
    setStarred,
    remove,
    send,
    searchRecipients,
    clearDetail,
    clearRecipients,
    reset,
  }
})
