export type AssignmentAvailabilityStatus = "open" | "late" | "closed" | "unscheduled"
export type AssignmentSubmissionKind = "text" | "file"
export type AssignmentSubmissionManagementReason =
  | "not_owner"
  | "context_mismatch"
  | "course_setting_disabled"
  | "reviewed"
  | "edition_blocked"
  | "session_locked"

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
  fileSubmissionAllowed: boolean
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
  canEdit: boolean
  canDelete: boolean
  editBlockedReason: AssignmentSubmissionManagementReason | null
  deleteBlockedReason: AssignmentSubmissionManagementReason | null
  reviewed: boolean
}

export interface AssignmentDetail {
  assignment: AssignmentSummary
  submissions: AssignmentSubmission[]
}

interface AssignmentSubmissionBaseInput {
  assignmentId: number
  courseId: number
  sessionId: number | null
  title: string
}

export interface AssignmentTextSubmissionInput extends AssignmentSubmissionBaseInput {
  kind: "text"
  text: string
}

export interface AssignmentFileSubmissionInput extends AssignmentSubmissionBaseInput {
  kind: "file"
  fileName: string
  mimeType: string
  base64Content: string
}

export type AssignmentSubmissionInput =
  | AssignmentTextSubmissionInput
  | AssignmentFileSubmissionInput

export interface AssignmentSubmissionResult {
  id: number
  title: string
  submittedAt: string
  hasFile: boolean
}

export interface AssignmentSubmissionUpdateInput {
  assignmentId: number
  courseId: number
  sessionId: number | null
  title: string
  description: string
}

export interface AssignmentSubmissionDeleteInput {
  submissionId: number
  assignmentId: number
  courseId: number
  sessionId: number | null
}
