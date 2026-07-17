import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import { HttpClientError } from "@/services/http/HttpClientError"

export class NativeHttpClient implements HttpClient {
  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    void request

    throw new HttpClientError(
      "unsupported",
      "Native HTTP transport will be implemented in the dedicated Android batch.",
    )
  }
}
