export interface CourseLink {
  iid: number
  title: string
  description: string
  url: string
  target: string | null
  position: number | null
  sessionId: number | null
}

export interface CourseLinkCategory {
  iid: number
  title: string
  description: string
  links: CourseLink[]
}

export interface CourseLinksSnapshot {
  uncategorized: CourseLink[]
  categories: CourseLinkCategory[]
  totalItems: number
}
