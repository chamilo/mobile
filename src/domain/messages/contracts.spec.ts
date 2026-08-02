import { describe, expect, it } from "vitest"

import {
  MessageContractError,
  normalizeMessageCollection,
  normalizeMessageRecipients,
} from "@/domain/messages/contracts"

const message = {
  id: 42,
  box: "inbox",
  title: "Welcome",
  preview: "Hello",
  content: null,
  sendDate: "2026-07-26T10:00:00+00:00",
  read: false,
  starred: false,
  attachmentCount: 0,
  senderId: 7,
  senderUsername: "teacher",
  senderName: "Teacher One",
  recipientIds: [8],
  recipientNames: ["Student One"],
  parentId: null,
}

describe("message contracts", () => {
  it("normalizes an API Platform message collection", () => {
    expect(normalizeMessageCollection({ member: [message] })).toEqual([message])
  })

  it("accepts omitted nullable fields in collection summaries", () => {
    const summary = { ...message }
    Reflect.deleteProperty(summary, "content")
    Reflect.deleteProperty(summary, "parentId")

    expect(normalizeMessageCollection({ "hydra:member": [summary] })).toEqual([
      {
        ...message,
        content: null,
        parentId: null,
      },
    ])
  })

  it("normalizes recipient search results", () => {
    expect(
      normalizeMessageRecipients({
        "hydra:member": [
          {
            id: 8,
            username: "student",
            fullName: "Student One",
          },
        ],
      }),
    ).toEqual([
      {
        id: 8,
        username: "student",
        fullName: "Student One",
      },
    ])
  })

  it("rejects incomplete message payloads", () => {
    expect(() => normalizeMessageCollection([{ ...message, senderId: null }])).toThrow(
      MessageContractError,
    )
  })
})
