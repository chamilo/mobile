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
  progress: number
  completedItems: number
  totalItems: number
  totalTime: number
  currentItemId: number
  previousItemId: number
  nextItemId: number
  contentUrl: string | null
  items: LearningPathRuntimeItem[]
}
