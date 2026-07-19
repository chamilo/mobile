export type AssignmentAvailabilityStatus = "open" | "late" | "closed" | "unscheduled"

export interface AssignmentSummary {
  id: number
  title: string
  description: string
  publishedAt: string | null
  dueAt: string | null
  endsAt: string | null
  maximumScore: number | null
  gradebookWeight: number | null
  textSubmissionAllowed: boolean
  allowedExtensions: string[]
  availabilityStatus: AssignmentAvailabilityStatus
  submittedStudentCount: number
  lastSubmissionAt: string | null
}

export interface AssignmentCollection {
  items: AssignmentSummary[]
  totalItems: number
}

export interface AssignmentComment {
  id: number
  text: string
  sentAt: string | null
  authorName: string
  fileName: string | null
  downloadUrl: string | null
}

export interface AssignmentSubmission {
  id: number
  title: string
  description: string
  sentAt: string | null
  score: number | null
  maximumScore: number | null
  hasFile: boolean
  downloadUrl: string | null
  correctionTitle: string | null
  correctionDownloadUrl: string | null
  comments: AssignmentComment[]
}

export interface AssignmentDetail {
  assignment: AssignmentSummary
  submissions: AssignmentSubmission[]
}
