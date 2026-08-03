export function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

export function isUncertainDeliveryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const code = (error as { code?: unknown }).code
  return code === "network" || code === "timeout"
}

export function temporaryOfflineId(): number {
  return -Math.max(1, Date.now())
}
