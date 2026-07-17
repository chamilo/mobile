import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export type AccessTokenProvider = () => Promise<string | null>

export class AuthenticatedHttpClient implements HttpClient {
  constructor(
    private readonly client: HttpClient,
    private readonly tokenProvider: AccessTokenProvider,
  ) {}

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    const token = await this.tokenProvider()

    if (!token) {
      throw new HttpClientError("authentication", "An authenticated campus session is required.")
    }

    return this.client.request<TData, TBody>({
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }
}
