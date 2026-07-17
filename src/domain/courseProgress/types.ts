export interface CourseProgressPlan {
  iid: number
  title: string
  description: string
  descriptionType: string | null
}
export interface CourseProgressAdvance {
  iid: number
  content: string
  startDate: string | null
  formattedStartDate: string
  duration: number
  doneAdvance: boolean
}
export interface CourseProgressThematic {
  iid: number
  title: string
  content: string
  isInheritedFromCourse: boolean
  average: number
  plans: CourseProgressPlan[]
  advances: CourseProgressAdvance[]
}
export interface CourseProgressSnapshot {
  courseId: number
  sessionId: number | null
  studentView: boolean
  totalAverage: number
  totalItems: number
  items: CourseProgressThematic[]
}
