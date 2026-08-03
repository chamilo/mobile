import type { HttpClient, HttpRequest, HttpResponse } from "@/services/http/HttpClient"
import {
  reportCampusRequestFailure,
  reportCampusRequestSuccess,
} from "@/services/offline/CampusRequestMonitor"

export class ObservedCampusHttpClient implements HttpClient {
  constructor(
    private readonly campusId: string,
    private readonly client: HttpClient,
  ) {}

  async request<TData, TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse<TData>> {
    try {
      const response = await this.client.request<TData, TBody>(request)
      reportCampusRequestSuccess(this.campusId)

      return response
    } catch (error) {
      reportCampusRequestFailure(this.campusId, error)
      throw error
    }
  }
}
