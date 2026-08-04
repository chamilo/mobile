import { isTokenExpired } from "@/domain/auth/jwt"
import type { CampusProfile } from "@/domain/campus/types"
import { AuthenticatedHttpClient } from "@/services/auth/AuthenticatedHttpClient"
import { createTokenStorage } from "@/services/auth/createTokenStorage"
import type { TokenStorage } from "@/services/auth/TokenStorage"
import type { HttpClient } from "@/services/http/HttpClient"
import { OfflineCachedHttpClient } from "@/services/http/OfflineCachedHttpClient"
import { createHttpClient } from "@/services/http/createHttpClient"

export function createAuthenticatedHttpClient(
  campus: CampusProfile,
  tokenStorage: TokenStorage = createTokenStorage(),
  client: HttpClient = createHttpClient(campus),
): HttpClient {
  const authenticatedClient = new AuthenticatedHttpClient(client, async () => {
    const storedToken = await tokenStorage.load(campus.id)

    if (!storedToken) {
      return null
    }

    if (isTokenExpired(storedToken.expiresAt)) {
      await tokenStorage.remove(campus.id)

      return null
    }

    return storedToken.token
  })

  return new OfflineCachedHttpClient(campus.id, authenticatedClient)
}
