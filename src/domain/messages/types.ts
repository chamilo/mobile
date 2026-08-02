export type MessageBox = "inbox" | "sent"

export interface MobileMessage {
  id: number
  box: MessageBox
  title: string
  preview: string
  content: string | null
  sendDate: string
  read: boolean
  starred: boolean
  attachmentCount: number
  senderId: number
  senderUsername: string
  senderName: string
  recipientIds: number[]
  recipientNames: string[]
  parentId: number | null
}

export interface MobileMessageRecipient {
  id: number
  username: string
  fullName: string
}

export interface MessageListFilters {
  search?: string
  unread?: boolean
  starred?: boolean
}

export interface MessageWriteInput {
  recipientId: number
  title: string
  content: string
  parentId?: number | null
}
