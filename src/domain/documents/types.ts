export type DocumentFileType = "folder" | "file" | "html" | "certificate" | string

export interface DocumentResourceFile {
  mimeType: string | null
  originalName: string | null
  size: number | null
  image: boolean
  video: boolean
  text: boolean
}

export interface CourseDocument {
  iid: number
  title: string
  filetype: DocumentFileType
  contentUrl: string | null
  downloadUrl: string | null
  resourceNodeId: number
  parentResourceNodeId: number | null
  file: DocumentResourceFile
}

export interface DocumentsSnapshot {
  items: CourseDocument[]
  totalItems: number
}

export interface DocumentBreadcrumb {
  nodeId: number | null
  title: string
}
