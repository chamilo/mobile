import { describe, expect, it } from "vitest"

import { buildBreadcrumbs, childrenForNode, inferRootNodeId } from "@/domain/documents/tree"
import type { CourseDocument } from "@/domain/documents/types"

const emptyFile = {
  mimeType: null,
  originalName: null,
  size: null,
  image: false,
  video: false,
  text: false,
}

const items: CourseDocument[] = [
  {
    iid: 1,
    title: "Folder B",
    filetype: "folder",
    contentUrl: null,
    downloadUrl: null,
    resourceNodeId: 20,
    parentResourceNodeId: 10,
    file: emptyFile,
  },
  {
    iid: 2,
    title: "Folder A",
    filetype: "folder",
    contentUrl: null,
    downloadUrl: null,
    resourceNodeId: 30,
    parentResourceNodeId: 20,
    file: emptyFile,
  },
  {
    iid: 3,
    title: "File",
    filetype: "file",
    contentUrl: "/view",
    downloadUrl: "/download",
    resourceNodeId: 40,
    parentResourceNodeId: 30,
    file: emptyFile,
  },
]

describe("document tree", () => {
  it("infers the course resource node as the local root", () => {
    expect(inferRootNodeId(items)).toBe(10)
  })

  it("returns direct children and folders first", () => {
    expect(childrenForNode(items, null, 10).map(({ iid }) => iid)).toEqual([1])
  })

  it("builds breadcrumbs from the folder hierarchy", () => {
    expect(buildBreadcrumbs(items, 30, "Documents")).toEqual([
      { nodeId: null, title: "Documents" },
      { nodeId: 20, title: "Folder B" },
      { nodeId: 30, title: "Folder A" },
    ])
  })
})
