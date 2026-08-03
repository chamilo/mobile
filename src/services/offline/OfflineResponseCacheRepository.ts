import type { HttpRequest, HttpResponse, HttpResponseType } from "@/services/http/HttpClient"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"
import type { OfflineDatabase } from "@/services/offline/OfflineDatabase"
import { buildOfflineNamespace } from "@/services/offline/OfflineSnapshotRepository"

interface OfflineResponseRecord {
  version: 1
  key: string
  campusId: string
  userId: number
  namespace: string
  requestKey: string
  savedAt: string
  status: number
  headers: Record<string, string>
  responseType: HttpResponseType
  data: unknown
  courseId?: number | null
  sizeBytes?: number
}

export interface OfflineResponseCacheStats {
  records: number
  bytes: number
}

export interface OfflineResponseCacheRepository {
  load<TData>(
    campusId: string,
    userId: number,
    request: HttpRequest,
  ): Promise<HttpResponse<TData> | null>
  save<TData>(
    campusId: string,
    userId: number,
    request: HttpRequest,
    response: HttpResponse<TData>,
    courseId?: number | null,
  ): Promise<void>
  getStats(
    campusId: string,
    userId: number,
    courseId?: number | null,
  ): Promise<OfflineResponseCacheStats>
  clearCourse(campusId: string, userId: number, courseId: number): Promise<void>
  clearCampus(campusId: string): Promise<void>
}

function stableQuery(query: HttpRequest["query"]): Array<[string, string]> {
  return Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([left], [right]) => left.localeCompare(right))
}

export function buildOfflineResponseRequestKey(request: HttpRequest): string {
  return JSON.stringify({
    method: request.method,
    path: request.path,
    query: stableQuery(request.query),
    accept: request.headers?.Accept ?? request.headers?.accept ?? "",
    responseType: request.responseType ?? "json",
  })
}

function recordKey(campusId: string, userId: number, requestKey: string): string {
  return `${buildOfflineNamespace(campusId, userId)}:response:${requestKey}`
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function inferCourseId(request: HttpRequest): number | null {
  const query = request.query ?? {}
  const queryCourseId =
    positiveInteger(query.cid) ??
    positiveInteger(query.courseId) ??
    positiveInteger(query.course_id)

  if (queryCourseId) return queryCourseId

  const courseIri = typeof query.course === "string" ? query.course : ""
  const iriMatch = courseIri.match(/\/api\/courses\/(\d+)/)
  if (iriMatch) return positiveInteger(iriMatch[1])

  const pathMatch = request.path.match(/\/api\/courses\/(\d+)/)

  return pathMatch ? positiveInteger(pathMatch[1]) : null
}

function estimateDataSize(data: unknown): number {
  if (data instanceof Blob) return data.size
  if (data instanceof ArrayBuffer) return data.byteLength
  if (ArrayBuffer.isView(data)) return data.byteLength
  if (typeof data === "string") return new TextEncoder().encode(data).byteLength
  if (data === null || data === undefined) return 0

  try {
    return new TextEncoder().encode(JSON.stringify(data)).byteLength
  } catch {
    return 0
  }
}

export class IndexedDbOfflineResponseCacheRepository implements OfflineResponseCacheRepository {
  constructor(private readonly database: OfflineDatabase = indexedDbOfflineDatabase) {}

  async load<TData>(
    campusId: string,
    userId: number,
    request: HttpRequest,
  ): Promise<HttpResponse<TData> | null> {
    const requestKey = buildOfflineResponseRequestKey(request)
    const record = await this.database.get<OfflineResponseRecord>(
      "responses",
      recordKey(campusId, userId, requestKey),
    )

    if (!record) {
      return null
    }

    return {
      status: record.status,
      headers: {
        ...record.headers,
        "x-chamilo-offline-cache": "true",
        "x-chamilo-offline-saved-at": record.savedAt,
      },
      data: structuredClone(record.data) as TData,
    }
  }

  async save<TData>(
    campusId: string,
    userId: number,
    request: HttpRequest,
    response: HttpResponse<TData>,
    courseId?: number | null,
  ): Promise<void> {
    const requestKey = buildOfflineResponseRequestKey(request)
    const namespace = buildOfflineNamespace(campusId, userId)

    await this.database.put<OfflineResponseRecord>("responses", {
      version: 1,
      key: recordKey(campusId, userId, requestKey),
      campusId,
      userId,
      namespace,
      requestKey,
      savedAt: new Date().toISOString(),
      status: response.status,
      headers: { ...response.headers },
      responseType: request.responseType ?? "json",
      data: structuredClone(response.data),
      courseId: courseId ?? inferCourseId(request),
      sizeBytes: estimateDataSize(response.data),
    })
  }

  async getStats(
    campusId: string,
    userId: number,
    courseId?: number | null,
  ): Promise<OfflineResponseCacheStats> {
    const records = await this.database.getAll<OfflineResponseRecord>("responses")
    const filtered = records.filter(
      (record) =>
        record.campusId === campusId &&
        record.userId === userId &&
        (courseId === undefined || courseId === null || record.courseId === courseId),
    )

    return {
      records: filtered.length,
      bytes: filtered.reduce(
        (total, record) => total + (record.sizeBytes ?? estimateDataSize(record.data)),
        0,
      ),
    }
  }

  async clearCourse(campusId: string, userId: number, courseId: number): Promise<void> {
    const records = await this.database.getAll<OfflineResponseRecord>("responses")

    for (const record of records) {
      if (
        record.campusId === campusId &&
        record.userId === userId &&
        record.courseId === courseId
      ) {
        await this.database.delete("responses", record.key)
      }
    }
  }

  async clearCampus(campusId: string): Promise<void> {
    await this.database.clearStoreCampus("responses", campusId)
  }
}

export const offlineResponseCacheRepository = new IndexedDbOfflineResponseCacheRepository()
