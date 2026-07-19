import type { AgendaEvent, AgendaRoom, AgendaSnapshot } from "@/domain/agenda/types"

export class AgendaContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AgendaContractError"
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgendaContractError(`${field} must be an object.`)
  }

  return value as Record<string, unknown>
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new AgendaContractError(`${field} must be an array.`)
  }

  return value
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new AgendaContractError(`${field} must be a string.`)
  }

  return value
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function normalizeRoom(value: unknown): AgendaRoom | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const room = value as Record<string, unknown>
  const id = nullableInteger(room.id)
  const title = nullableString(room.title)

  if (id === null || title === null) {
    return null
  }

  return {
    id,
    title,
    branchTitle: nullableString(room.branchTitle),
  }
}

function normalizeEvent(value: unknown, index: number): AgendaEvent {
  const item = asRecord(value, `items[${index}]`)
  const resourceNode =
    item.resourceNode && typeof item.resourceNode === "object" && !Array.isArray(item.resourceNode)
      ? (item.resourceNode as Record<string, unknown>)
      : null
  const startDate = asString(item.startDate, `items[${index}].startDate`)
  const endDate = asString(item.endDate, `items[${index}].endDate`)

  if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    throw new AgendaContractError(`items[${index}] contains an invalid date.`)
  }

  return {
    id: asString(item.id, `items[${index}].id`),
    title: nullableString(item.title) ?? `Event ${index + 1}`,
    content: typeof item.content === "string" ? item.content : "",
    startDate,
    endDate,
    allDay: item.allDay === true,
    color: nullableString(item.color),
    type: nullableString(item.type),
    room: normalizeRoom(item.room),
    resourceNodeId: resourceNode ? nullableInteger(resourceNode.id) : null,
  }
}

export function normalizeAgendaResponse(value: unknown): AgendaSnapshot {
  const response = asRecord(value, "response")
  const rawItems = Array.isArray(response["hydra:member"])
    ? response["hydra:member"]
    : Array.isArray(response.member)
      ? response.member
      : null

  const items = asArray(rawItems, "items")
    .map(normalizeEvent)
    .sort((left, right) => Date.parse(left.startDate) - Date.parse(right.startDate))
  const rawTotal = response["hydra:totalItems"] ?? response.totalItems
  const totalItems =
    typeof rawTotal === "number" && Number.isInteger(rawTotal) ? rawTotal : items.length

  if (totalItems !== items.length) {
    throw new AgendaContractError("The agenda total does not match the returned events.")
  }

  return { items, totalItems }
}
