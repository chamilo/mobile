export function createCampusId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `campus-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
