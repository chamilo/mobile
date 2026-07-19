import type { CourseDocument, DocumentBreadcrumb } from "@/domain/documents/types"

export function inferRootNodeId(items: CourseDocument[]): number | null {
  const itemNodeIds = new Set(items.map((item) => item.resourceNodeId))
  const externalParents = items
    .map((item) => item.parentResourceNodeId)
    .filter((parent): parent is number => parent !== null && !itemNodeIds.has(parent))

  return externalParents[0] ?? null
}

export function childrenForNode(
  items: CourseDocument[],
  nodeId: number | null,
  rootNodeId: number | null,
): CourseDocument[] {
  const effectiveNodeId = nodeId ?? rootNodeId

  return items
    .filter((item) => item.parentResourceNodeId === effectiveNodeId)
    .sort((left, right) => {
      if (left.filetype === "folder" && right.filetype !== "folder") return -1
      if (left.filetype !== "folder" && right.filetype === "folder") return 1

      return left.title.localeCompare(right.title)
    })
}

export function buildBreadcrumbs(
  items: CourseDocument[],
  currentNodeId: number | null,
  rootTitle: string,
): DocumentBreadcrumb[] {
  const breadcrumbs: DocumentBreadcrumb[] = [{ nodeId: null, title: rootTitle }]

  if (currentNodeId === null) {
    return breadcrumbs
  }

  const foldersByNodeId = new Map(
    items.filter((item) => item.filetype === "folder").map((item) => [item.resourceNodeId, item]),
  )
  const chain: CourseDocument[] = []
  const visited = new Set<number>()
  let nodeId: number | null = currentNodeId

  while (nodeId !== null && !visited.has(nodeId)) {
    visited.add(nodeId)
    const folder = foldersByNodeId.get(nodeId)

    if (!folder) break

    chain.unshift(folder)
    nodeId = folder.parentResourceNodeId
  }

  return [
    ...breadcrumbs,
    ...chain.map((folder) => ({
      nodeId: folder.resourceNodeId,
      title: folder.title,
    })),
  ]
}
