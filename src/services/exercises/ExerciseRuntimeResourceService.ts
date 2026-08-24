import type { HttpClient } from "@/services/http/HttpClient"

export class ExerciseRuntimeResourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExerciseRuntimeResourceError"
  }
}

function buildSameCampusRequest(
  campusBaseUrl: string,
  resourceUrl: string,
): { path: string; query: Record<string, string> } {
  const campus = new URL(campusBaseUrl.endsWith("/") ? campusBaseUrl : `${campusBaseUrl}/`)
  const target = new URL(resourceUrl, campus)

  if (target.origin !== campus.origin) {
    throw new ExerciseRuntimeResourceError(
      "Exercise resources must use the selected campus origin.",
    )
  }

  const query: Record<string, string> = {}
  target.searchParams.forEach((value, key) => {
    query[key] = value
  })

  return {
    path: target.pathname,
    query,
  }
}

export class ExerciseRuntimeResourceService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly campusBaseUrl: string,
  ) {}

  async loadImage(resourceUrl: string): Promise<Blob> {
    if (!resourceUrl.trim()) {
      throw new ExerciseRuntimeResourceError("The exercise image URL is missing.")
    }

    const request = buildSameCampusRequest(this.campusBaseUrl, resourceUrl)
    const response = await this.httpClient.request<Blob>({
      method: "GET",
      path: request.path,
      query: request.query,
      headers: { Accept: "image/*" },
      responseType: "blob",
    })

    return response.data
  }
}
