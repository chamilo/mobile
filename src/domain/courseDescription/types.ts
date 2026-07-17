export interface CourseDescriptionType {
  value: number
  label: string
  icon: string
}

export interface CourseDescriptionItem {
  iid: number
  title: string
  content: string
  descriptionType: number
  progress: number
  resourceNodeId: number | null
  sessionId: number | null
  language: string | null
  isInheritedFromCourse: boolean
}

export interface CourseDescriptionSettings {
  searchEnabled: boolean
  saveTitlesAsHtml: boolean
}

export interface CourseDescriptionSnapshot {
  items: CourseDescriptionItem[]
  totalItems: number
  courseId: number
  sessionId: number | null
  studentView: boolean
  types: CourseDescriptionType[]
  settings: CourseDescriptionSettings
}
