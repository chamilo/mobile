import type { CourseNavigationContext } from "@/domain/courses/types"

export interface AnnouncementAuthor {
  id: number
  username: string
  fullName: string
}

export interface AnnouncementAttachment {
  id: number
  filename: string
  comment: string
  size: number
  downloadUrl: string
}

export interface AnnouncementSummary {
  id: number
  title: string
  author: AnnouncementAuthor | null
  createdAt: string | null
  updatedAt: string | null
  emailSent: boolean
  hasAttachments: boolean
  attachmentCount: number
  displayOrder: number
}

export interface AnnouncementDetail extends AnnouncementSummary {
  contentHtml: string
  language: string | null
  attachments: AnnouncementAttachment[]
}

export interface AnnouncementListSnapshot {
  context: CourseNavigationContext
  items: AnnouncementSummary[]
  totalItems: number
  fetchedAt: string
}

export interface AnnouncementDetailSnapshot {
  context: CourseNavigationContext
  item: AnnouncementDetail
  fetchedAt: string
}
