import {
  MessageContractError,
  normalizeMessage,
  normalizeMessageCollection,
  normalizeMessageRecipients,
} from "@/domain/messages/contracts"
import type {
  MessageBox,
  MessageListFilters,
  MessageWriteInput,
  MobileMessage,
  MobileMessageRecipient,
} from "@/domain/messages/types"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type MessagesErrorCode =
  | "session_required"
  | "session_expired"
  | "access_denied"
  | "not_found"
  | "network"
  | "timeout"
  | "invalid_response"
  | "server"

export class MessagesServiceError extends Error {
  constructor(
    public readonly code: MessagesErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "MessagesServiceError"
  }
}

function mapError(error: unknown): MessagesServiceError {
  if (error instanceof MessagesServiceError) {
    return error
  }

  if (error instanceof MessageContractError) {
    return new MessagesServiceError("invalid_response", error.message, error)
  }

  if (!(error instanceof HttpClientError)) {
    return new MessagesServiceError("server", "Message request failed.", error)
  }

  if (error.kind === "authentication") {
    return new MessagesServiceError("session_required", error.message, error)
  }

  if (error.kind === "network") {
    return new MessagesServiceError("network", error.message, error)
  }

  if (error.kind === "timeout") {
    return new MessagesServiceError("timeout", error.message, error)
  }

  if (error.kind === "http" && error.status === 401) {
    return new MessagesServiceError("session_expired", error.message, error)
  }

  if (error.kind === "http" && error.status === 403) {
    return new MessagesServiceError("access_denied", error.message, error)
  }

  if (error.kind === "http" && error.status === 404) {
    return new MessagesServiceError("not_found", error.message, error)
  }

  return new MessagesServiceError("server", error.message, error)
}

const jsonHeaders = {
  Accept: "application/ld+json",
  "Content-Type": "application/ld+json",
}

export class MessagesApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getList(box: MessageBox, filters: MessageListFilters = {}): Promise<MobileMessage[]> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/mobile_messages",
        query: {
          box,
          search: filters.search?.trim() || undefined,
          unread: filters.unread,
          starred: filters.starred,
        },
        headers: { Accept: "application/ld+json" },
      })

      return normalizeMessageCollection(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async getDetail(messageId: number): Promise<MobileMessage> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: `/api/mobile_messages/${messageId}`,
        headers: { Accept: "application/ld+json" },
      })

      return normalizeMessage(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async markRead(messageId: number): Promise<MobileMessage> {
    return this.messageAction(messageId, "read")
  }

  async setStarred(messageId: number, starred: boolean): Promise<MobileMessage> {
    return this.messageAction(messageId, "star", { starred })
  }

  async remove(messageId: number): Promise<void> {
    try {
      await this.httpClient.request({
        method: "DELETE",
        path: `/api/mobile_messages/${messageId}`,
        headers: { Accept: "application/ld+json" },
      })
    } catch (error) {
      throw mapError(error)
    }
  }

  async send(input: MessageWriteInput): Promise<MobileMessage> {
    try {
      const response = await this.httpClient.request<unknown, MessageWriteInput>({
        method: "POST",
        path: "/api/mobile_messages",
        body: input,
        headers: jsonHeaders,
      })

      return normalizeMessage(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  async searchRecipients(query: string): Promise<MobileMessageRecipient[]> {
    try {
      const response = await this.httpClient.request<unknown>({
        method: "GET",
        path: "/api/mobile_message_recipients",
        query: { q: query.trim() },
        headers: { Accept: "application/ld+json" },
      })

      return normalizeMessageRecipients(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }

  private async messageAction(
    messageId: number,
    action: "read" | "star",
    body?: { starred: boolean },
  ): Promise<MobileMessage> {
    try {
      const response = await this.httpClient.request<unknown, { starred: boolean } | undefined>({
        method: "POST",
        path: `/api/mobile_messages/${messageId}/${action}`,
        body,
        headers: jsonHeaders,
      })

      return normalizeMessage(response.data)
    } catch (error) {
      throw mapError(error)
    }
  }
}
