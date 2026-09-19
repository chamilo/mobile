import { describe, expect, it, vi } from "vitest"

import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"
import {
  UserProfileApiService,
  type UserProfileUpdateError,
} from "@/services/profile/UserProfileApiService"

describe("UserProfileApiService", () => {
  it("patches only the current user's locale through the existing User ApiResource", async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} })
    const service = new UserProfileApiService({ request } as HttpClient)

    await expect(service.updateLocale(7, "fr-fr")).resolves.toBeUndefined()

    expect(request).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/api/users/7",
      headers: {
        Accept: "application/ld+json",
        "Content-Type": "application/merge-patch+json",
      },
      body: { locale: "fr_FR" },
    })
  })

  it("maps an expired authenticated request without changing the write contract", async () => {
    const request = vi.fn().mockRejectedValue(new HttpClientError("http", "Unauthorized", 401))
    const service = new UserProfileApiService({ request } as HttpClient)

    await expect(service.updateLocale(7, "en_US")).rejects.toEqual(
      expect.objectContaining<UserProfileUpdateError>({ code: "session_expired" }),
    )
  })
})
