import type { MessageBox, MobileMessage, MobileMessageRecipient } from "@/domain/messages/types"

export class MessageContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MessageContractError"
  }
}

function collectionMembers(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (!value || typeof value !== "object") {
    throw new MessageContractError("Message collection response is invalid.")
  }

  const payload = value as Record<string, unknown>
  const members = payload.member ?? payload["hydra:member"]

  if (!Array.isArray(members)) {
    throw new MessageContractError("Message collection members are missing.")
  }

  return members
}

function isMessageBox(value: unknown): value is MessageBox {
  return value === "inbox" || value === "sent"
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new MessageContractError(`Message ${field} is invalid.`)
  }

  return [...value]
}

function numberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => Number.isInteger(item) && item > 0)) {
    throw new MessageContractError(`Message ${field} is invalid.`)
  }

  return [...value]
}

function nullableContent(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== "string") {
    throw new MessageContractError("Message content is invalid.")
  }

  return value
}

function nullableParentId(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new MessageContractError("Message parent identifier is invalid.")
  }

  return Number(value)
}

export function normalizeMessage(value: unknown): MobileMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MessageContractError("Message response is invalid.")
  }

  const item = value as Record<string, unknown>

  if (
    !Number.isInteger(item.id) ||
    !isMessageBox(item.box) ||
    typeof item.title !== "string" ||
    typeof item.preview !== "string" ||
    typeof item.sendDate !== "string" ||
    typeof item.read !== "boolean" ||
    typeof item.starred !== "boolean" ||
    !Number.isInteger(item.attachmentCount) ||
    !Number.isInteger(item.senderId) ||
    typeof item.senderUsername !== "string" ||
    typeof item.senderName !== "string"
  ) {
    throw new MessageContractError("Message response is incomplete.")
  }

  return {
    id: Number(item.id),
    box: item.box,
    title: item.title,
    preview: item.preview,
    content: nullableContent(item.content),
    sendDate: item.sendDate,
    read: item.read,
    starred: item.starred,
    attachmentCount: Number(item.attachmentCount),
    senderId: Number(item.senderId),
    senderUsername: item.senderUsername,
    senderName: item.senderName,
    recipientIds: numberArray(item.recipientIds, "recipient identifiers"),
    recipientNames: stringArray(item.recipientNames, "recipient names"),
    parentId: nullableParentId(item.parentId),
  }
}

export function normalizeMessageCollection(value: unknown): MobileMessage[] {
  return collectionMembers(value).map(normalizeMessage)
}

export function normalizeMessageRecipient(value: unknown): MobileMessageRecipient {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MessageContractError("Message recipient response is invalid.")
  }

  const item = value as Record<string, unknown>

  if (
    !Number.isInteger(item.id) ||
    Number(item.id) <= 0 ||
    typeof item.username !== "string" ||
    typeof item.fullName !== "string"
  ) {
    throw new MessageContractError("Message recipient response is incomplete.")
  }

  return {
    id: Number(item.id),
    username: item.username,
    fullName: item.fullName,
  }
}

export function normalizeMessageRecipients(value: unknown): MobileMessageRecipient[] {
  return collectionMembers(value).map(normalizeMessageRecipient)
}
