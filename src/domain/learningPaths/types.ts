export interface LearningPathRuntimeItem {
  id: number
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

export interface LearningPathRuntime {
  lpId: number
  title: string
  lpType: number
  runtimeSupported: boolean
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
  items: LearningPathRuntimeItem[]
}
