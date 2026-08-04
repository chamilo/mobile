const activeUsers = new Map<string, number>()

export function setOfflineSessionUser(campusId: string, userId: number): void {
  activeUsers.set(campusId, userId)
}

export function getOfflineSessionUser(campusId: string): number | null {
  return activeUsers.get(campusId) ?? null
}

export function clearOfflineSessionUser(campusId?: string): void {
  if (campusId) {
    activeUsers.delete(campusId)
    return
  }

  activeUsers.clear()
}
