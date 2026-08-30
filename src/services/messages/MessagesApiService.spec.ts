import { describe, expect, it, vi } from "vitest"

import { MessagesApiService } from "@/services/messages/MessagesApiService"
import type { HttpClient } from "@/services/http/HttpClient"

describe("MessagesApiService recipient search", () => {
  it("uses the verified mobile recipient endpoint and q parameter", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        member: [{ id: 9, username: "admin", fullName: "Admin User" }],
      },
    })

    const recipients = await new MessagesApiService({ request } as HttpClient).searchRecipients(
      " admin ",
    )

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/mobile_message_recipients",
      query: { q: "admin" },
      headers: { Accept: "application/ld+json" },
    })
    expect(recipients).toEqual([{ id: 9, username: "admin", fullName: "Admin User" }])
  })
})
