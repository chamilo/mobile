export type AcceleratedCourseToolKey = "learning-paths" | "exercises"

export interface CourseToolCard {
  id: string
  title: string
  description: string
  metadata: string[]
  progress: number | null
  score: string | null
  status: string | null
}

export interface CourseToolCollection {
  items: CourseToolCard[]
  totalItems: number
  warningKey: string | null
}
