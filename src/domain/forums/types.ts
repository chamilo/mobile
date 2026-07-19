export type ForumAvailabilityStatus = "open" | "not_started" | "closed" | "unknown"

export interface ForumCategorySummary {
  id: number
  title: string
  description: string
  locked: boolean
  visible: boolean
  position: number
}

export interface ForumSummary {
  id: number
  title: string
  description: string
  categoryId: number | null
  categoryTitle: string | null
  threadCount: number
  postCount: number
  locked: boolean
  visible: boolean
  availabilityStatus: ForumAvailabilityStatus
  groupForum: boolean
  moderated: boolean
  allowNewThreads: boolean
  subscribed: boolean
  canSubscribe: boolean
  startTime: string | null
  endTime: string | null
}

export interface ForumCategoryGroup {
  category: ForumCategorySummary
  forums: ForumSummary[]
}

export interface ForumCollection {
  categories: ForumCategoryGroup[]
  uncategorized: ForumSummary[]
  totalItems: number
}

export interface ForumThreadSummary {
  id: number
  title: string
  locked: boolean
  visible: boolean
  sticky: boolean
  replyCount: number
  viewCount: number
  createdAt: string | null
  relativeTime: string | null
  posterFullName: string
  posterRoleLabel: string
  lastPostTitle: string
  lastPostRelativeTime: string | null
  lastPosterFullName: string
  subscribed: boolean
  canSubscribe: boolean
  gradebookEnabled: boolean
  lockedByGradebook: boolean
}

export interface ForumThreadsCollection {
  forumId: number
  forumTitle: string
  forumLocked: boolean
  availabilityStatus: ForumAvailabilityStatus
  allowNewThreads: boolean
  items: ForumThreadSummary[]
  totalItems: number
}

export interface ForumAttachmentSummary {
  id: number
  filename: string
  size: number | null
  downloadUrl: string | null
}

export interface ForumPostSummary {
  id: number
  title: string
  text: string
  createdAt: string | null
  relativeTime: string | null
  parentId: number | null
  visible: boolean
  statusLabel: string
  posterFullName: string
  posterRoleLabel: string
  attachments: ForumAttachmentSummary[]
}

export interface ForumThreadDetail {
  forumId: number
  forumTitle: string
  forumLocked: boolean
  availabilityStatus: ForumAvailabilityStatus
  threadId: number
  threadTitle: string
  threadLocked: boolean
  threadSticky: boolean
  posterFullName: string
  posterRoleLabel: string
  createdAt: string | null
  relativeTime: string | null
  canReply: boolean
  posts: ForumPostSummary[]
}
