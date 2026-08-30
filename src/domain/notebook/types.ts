export interface NotebookLanguageOption {
  label: string
  value: string
}

export interface NotebookItem {
  iid: number
  title: string
  content: string
  creationDate: string
  updateDate: string | null
  sessionId: number | null
  language: string | null
  canEdit: boolean
  canDelete: boolean
}

export interface NotebookListSnapshot {
  items: NotebookItem[]
  totalItems: number
  courseId: number
  sessionId: number | null
  canWrite: boolean
  studentView: boolean
  sort: string
  direction: string
}

export interface NotebookFormSnapshot {
  iid: number | null
  title: string
  content: string
  language: string
  languages: NotebookLanguageOption[]
  canWrite: boolean
  isNew: boolean
  fullEditor: boolean
}

export interface NotebookMutationInput {
  title: string
  content: string
  language: string
}
