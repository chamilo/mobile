export interface LearningPathRuntimeItem {
  id: number
  ref?: string
  title: string
  itemType: string
  parentId: number
  level: number
  displayOrder: number
  status: string
  score: number
  available: boolean
  isSection: boolean
  hasChildren: boolean
  hasPrerequisite: boolean
}

export interface LearningPathScormRuntime {
  enabled: boolean
  version: "1.2" | "2004" | ""
  itemViewId: number
  lpViewId: number
  userId: number
  lpType: number
  itemType: string
  forceCommit: boolean
  debug: boolean
  values: Record<string, string>
  packageEntryPath: string
  packageParameters: string
  packageFingerprint: string
  packageSize: number
}

export interface LearningPathScormCommitPayload {
  values: Record<string, string>
  changedKeys: string[]
  terminated: boolean
  reason: string
}

export interface LearningPathRuntime {
  lpId: number
  title: string
  lpType: number
  runtimeSupported: boolean
  isCStudioContent: boolean
  hideArrowNavigation: boolean
  hideToc: boolean
  accordionToc: boolean
  progress: number
  completedItems: number
  totalItems: number
  totalTime: number
  attemptMode: string
  currentAttempt: number
  currentItemAttempt: number
  maxAttempts: number
  canRestart: boolean
  minimumTime: number
  minimumTimeReached: boolean
  currentItemId: number
  previousItemId: number
  nextItemId: number
  contentUrl: string | null
  audioUrl: string | null
  audioTitle: string
  audioAutoplay: boolean
  actionToken: string
  scorm: LearningPathScormRuntime
  items: LearningPathRuntimeItem[]
}
