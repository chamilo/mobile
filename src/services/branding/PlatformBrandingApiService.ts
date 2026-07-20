import { normalizeCampusBranding } from "@/domain/branding/contracts"
import type { CampusBranding } from "@/domain/branding/types"
import type { CampusProfile } from "@/domain/campus/types"
import type { HttpClient } from "@/services/http/HttpClient"

export class PlatformBrandingApiService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly campus: CampusProfile,
  ) {}

  async getBranding(): Promise<CampusBranding> {
    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: "/platform-config/list",
      headers: {
        Accept: "application/json",
      },
    })

    return normalizeCampusBranding(response.data, this.campus)
  }
}
