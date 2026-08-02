import type { CampusProfile } from "@/domain/campus/types"

export type AuthenticatedCampusSessionListener = (
  campus: CampusProfile,
  userId: number,
) => void | Promise<void>
export type BeforeCampusSessionClearListener = (campus: CampusProfile) => void | Promise<void>
export type ActiveCampusSessionResetListener = () => void | Promise<void>

const authenticatedSessionListeners = new Set<AuthenticatedCampusSessionListener>()
const beforeSessionClearListeners = new Set<BeforeCampusSessionClearListener>()
const activeSessionResetListeners = new Set<ActiveCampusSessionResetListener>()

export function registerAuthenticatedCampusSessionListener(
  listener: AuthenticatedCampusSessionListener,
): () => void {
  authenticatedSessionListeners.add(listener)

  return () => authenticatedSessionListeners.delete(listener)
}

export function registerBeforeCampusSessionClearListener(
  listener: BeforeCampusSessionClearListener,
): () => void {
  beforeSessionClearListeners.add(listener)

  return () => beforeSessionClearListeners.delete(listener)
}

export function registerActiveCampusSessionResetListener(
  listener: ActiveCampusSessionResetListener,
): () => void {
  activeSessionResetListeners.add(listener)

  return () => activeSessionResetListeners.delete(listener)
}

async function notifyListeners<TArguments extends unknown[]>(
  listeners: ReadonlySet<(...arguments_: TArguments) => void | Promise<void>>,
  ...arguments_: TArguments
): Promise<void> {
  await Promise.allSettled([...listeners].map((listener) => listener(...arguments_)))
}

export async function notifyAuthenticatedCampusSession(
  campus: CampusProfile,
  userId: number,
): Promise<void> {
  await notifyListeners(authenticatedSessionListeners, campus, userId)
}

export async function notifyBeforeCampusSessionClear(campus: CampusProfile): Promise<void> {
  await notifyListeners(beforeSessionClearListeners, campus)
}

export async function notifyActiveCampusSessionReset(): Promise<void> {
  await notifyListeners(activeSessionResetListeners)
}
