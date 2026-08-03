import type { HttpClientError } from "@/services/http/HttpClientError"

export type CampusRequestStatus = "reachable" | "unreachable"

export interface CampusRequestEvent {
  campusId: string
  status: CampusRequestStatus
  checkedAt: string
}

export type CampusRequestListener = (event: CampusRequestEvent) => void

const listeners = new Set<CampusRequestListener>()

export function registerCampusRequestListener(listener: CampusRequestListener): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

function notify(event: CampusRequestEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}

export function reportCampusRequestSuccess(campusId: string): void {
  notify({ campusId, status: "reachable", checkedAt: new Date().toISOString() })
}

export function reportCampusRequestFailure(campusId: string, error: unknown): void {
  const kind = (error as Partial<HttpClientError> | null)?.kind

  notify({
    campusId,
    status: kind === "network" || kind === "timeout" ? "unreachable" : "reachable",
    checkedAt: new Date().toISOString(),
  })
}
