import { describe, expect, it, vi } from "vitest"

import { AuthApiService, AuthServiceError } from "@/services/auth/AuthApiService"
import type { HttpClient } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

const profile = {
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

describe("AuthApiService", () => {
  it("uses the verified JWT login contract", async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, data: { token: "jwt" } })
    const service = new AuthApiService({ request } as HttpClient)

    await expect(service.createToken({ username: "student", password: "secret" })).resolves.toBe(
      "jwt",
    )
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/api/authentication_token",
        body: { username: "student", password: "secret" },
      }),
    )
  })

  it("maps HTTP 401 to invalid credentials during login", async () => {
    const request = vi.fn().mockRejectedValue(new HttpClientError("http", "Unauthorized", 401))
    const service = new AuthApiService({ request } as HttpClient)

    await expect(service.createToken({ username: "student", password: "wrong" })).rejects.toEqual(
      expect.objectContaining<AuthServiceError>({ code: "invalid_credentials" }),
    )
  })

  it("loads the verified current-user profile with a bearer token", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: { "@context": "/api/contexts/CurrentUserProfile", ...profile },
    })
    const service = new AuthApiService({ request } as HttpClient)

    await expect(service.getCurrentUser("jwt")).resolves.toEqual(profile)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/api/me",
        headers: expect.objectContaining({ Authorization: "Bearer jwt" }),
      }),
    )
  })

  it("rejects incomplete profile responses", async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, data: { id: 7 } })
    const service = new AuthApiService({ request } as HttpClient)

    await expect(service.getCurrentUser("jwt")).rejects.toEqual(
      expect.objectContaining<AuthServiceError>({ code: "invalid_response" }),
    )
  })
})
