export type CourseSource = "direct" | "session"
export type SessionPeriod = "current" | "upcoming" | "past"
export type CourseRole = "teacher" | "student" | "unknown"

export interface CourseTeacher {
  id: number
  fullName: string
  illustrationUrl: string | null
}

export interface CourseSummary {
  id: number
  iri: string
  title: string
  code: string | null
  language: string | null
  description: string | null
  illustrationUrl: string | null
}

export interface CourseNavigationContext {
  courseId: number
  sessionId: number | null
  membershipId: number | null
  sessionCourseId: number | null
  source: CourseSource
}

export interface DirectCourseEnrollment {
  key: string
  source: "direct"
  membershipId: number
  membershipIri: string
  course: CourseSummary
  role: CourseRole
  progress: number | null
  score?: number | null
  bestScore?: number | null
  timeSpentSeconds?: number | null
  completed: boolean
  certificateAvailable: boolean
  hasNewContent: boolean
  hasRequirements: boolean
  accessAllowed: boolean
  teachers: CourseTeacher[]
  context: CourseNavigationContext
}

export interface SessionCourseEnrollment {
  key: string
  source: "session"
  sessionCourseId: number
  sessionCourseIri: string
  course: CourseSummary
  progress: number | null
  score: number | null
  bestScore: number | null
  timeSpentSeconds: number | null
  completed: boolean | null
  certificateAvailable: boolean | null
  context: CourseNavigationContext
}

export interface CourseSession {
  id: number
  iri: string
  title: string
  period: SessionPeriod
  displayStartDate: string | null
  displayEndDate: string | null
  durationDays: number | null
  daysLeft: number | null
  accessVisibility: number | null
  courses: SessionCourseEnrollment[]
}

export interface CoursesOverview {
  directCourses: DirectCourseEnrollment[]
  currentSessions: CourseSession[]
  upcomingSessions: CourseSession[]
  pastSessions: CourseSession[]
  fetchedAt: string
}

export interface HydraView {
  "@id"?: string
  "hydra:next"?: string
  "hydra:previous"?: string
}

export interface HydraCollection<TItem> {
  "@context"?: string
  "@id"?: string
  "@type"?: string
  "hydra:member": TItem[]
  "hydra:totalItems"?: number
  "hydra:view"?: HydraView
}
