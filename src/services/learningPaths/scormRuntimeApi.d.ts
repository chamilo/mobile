import type { LearningPathScormCommitPayload } from "@/domain/learningPaths/types"

export interface ScormRuntimeContext {
  api12: Record<string, (...arguments_: string[]) => string>
  api2004: Record<string, (...arguments_: string[]) => string>
  logLms(message: string, priority?: number): boolean
  logScorm(message: string, priority?: number): boolean
  flush(reason?: string): Promise<void>
  flushBeacon(reason?: string): boolean
  destroy(): void
}

export interface ScormNavigationTarget {
  ref: string
  available: boolean
}

export interface CreateScormRuntimeOptions {
  version: string
  initialValues: Record<string, string>
  forceCommit?: boolean
  debug?: boolean
  lpId?: number
  itemId?: number
  itemViewId?: number
  lpViewId?: number
  userId?: number
  lpType?: number
  itemType?: string
  commit(payload: LearningPathScormCommitPayload): Promise<void>
  beacon(payload: LearningPathScormCommitPayload): boolean
  onCommitted?(): void
  onNavigate?(request: string): void | Promise<void>
  hasNextItem?: boolean
  hasPreviousItem?: boolean
  navigationTargets?: ScormNavigationTarget[]
}

export function createScormRuntimeApi(options: CreateScormRuntimeOptions): ScormRuntimeContext
