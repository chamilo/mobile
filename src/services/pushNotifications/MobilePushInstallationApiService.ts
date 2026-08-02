import type { HttpClient } from "@/services/http/HttpClient"

export interface MobilePushInstallationRegistration {
  installationId: string
  platform: "android"
  createdAt: string
  lastSeenAt: string
}

interface MobilePushInstallationRequest {
  installationId: string
  token: string
  platform: "android"
}

export class MobilePushInstallationResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MobilePushInstallationResponseError"
  }
}

function parseRegistration(value: unknown): MobilePushInstallationRegistration {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MobilePushInstallationResponseError(
      "The campus returned an invalid push installation response.",
    )
  }

  const registration = value as Partial<MobilePushInstallationRegistration>

  if (
    typeof registration.installationId !== "string" ||
    !registration.installationId ||
    registration.platform !== "android" ||
    typeof registration.createdAt !== "string" ||
    !registration.createdAt ||
    typeof registration.lastSeenAt !== "string" ||
    !registration.lastSeenAt
  ) {
    throw new MobilePushInstallationResponseError(
      "The campus returned an incomplete push installation response.",
    )
  }

  return {
    installationId: registration.installationId,
    platform: registration.platform,
    createdAt: registration.createdAt,
    lastSeenAt: registration.lastSeenAt,
  }
}

export class MobilePushInstallationApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async register(
    installationId: string,
    token: string,
  ): Promise<MobilePushInstallationRegistration> {
    const response = await this.httpClient.request<unknown, MobilePushInstallationRequest>({
      method: "POST",
      path: "/api/mobile_push_installations",
      headers: {
        Accept: "application/ld+json",
        "Content-Type": "application/ld+json",
      },
      body: {
        installationId,
        token,
        platform: "android",
      },
    })

    return parseRegistration(response.data)
  }

  async remove(installationId: string): Promise<void> {
    await this.httpClient.request<void>({
      method: "DELETE",
      path: `/api/mobile_push_installations/${encodeURIComponent(installationId)}`,
      headers: {
        Accept: "application/ld+json",
      },
    })
  }
}
