export type CStudioChamiloResourceType =
  | "document"
  | "video"
  | "quiz"
  | "link"
  | "student_publication"
  | "forum"
  | "thread"
  | "survey"

export interface CStudioChamiloResource {
  tool: string
  type: CStudioChamiloResourceType
  id: number
  title: string
  launchUrl: string
  forumId: number | null
}

export interface CStudioChamiloResourceMetadata {
  resourceTool: string
  resourceKey: string
  title: string
  launchUrl: string
}

const TOOL_TYPES: Record<string, ReadonlySet<CStudioChamiloResourceType>> = {
  documents: new Set(["document", "video"]),
  tests: new Set(["quiz"]),
  links: new Set(["link"]),
  assignments: new Set(["student_publication"]),
  forums: new Set(["forum", "thread"]),
  surveys: new Set(["survey"]),
}

const RESOURCE_TYPES = new Set<CStudioChamiloResourceType>([
  "document",
  "video",
  "quiz",
  "link",
  "student_publication",
  "forum",
  "thread",
  "survey",
])

function positiveInteger(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function relativeUrl(value: string): URL | null {
  try {
    const url = new URL(value, "https://mobile.invalid")
    return url.origin === "https://mobile.invalid" ? url : null
  } catch {
    return null
  }
}

function validateLaunchUrl(
  type: CStudioChamiloResourceType,
  id: number,
  launchUrl: string,
): { valid: boolean; forumId: number | null } {
  if (type === "document" || type === "video") {
    return { valid: true, forumId: null }
  }

  const url = relativeUrl(launchUrl)
  if (!url) return { valid: false, forumId: null }

  if (type === "quiz") {
    const match = url.pathname.match(/^\/resources\/exercise\/\d+\/(\d+)\/player$/)
    return { valid: positiveInteger(match?.[1]) === id, forumId: null }
  }

  if (type === "link") {
    return {
      valid:
        url.pathname === "/main/link/link_goto.php" && positiveInteger(url.searchParams.get("link_id")) === id,
      forumId: null,
    }
  }

  if (type === "student_publication") {
    const match = url.pathname.match(/^\/resources\/assignment\/\d+\/submission\/(\d+)$/)
    return { valid: positiveInteger(match?.[1]) === id, forumId: null }
  }

  if (type === "forum") {
    const match = url.pathname.match(/^\/resources\/forum\/\d+\/forum\/(\d+)$/)
    return { valid: positiveInteger(match?.[1]) === id, forumId: null }
  }

  if (type === "thread") {
    const match = url.pathname.match(/^\/resources\/forum\/\d+\/forum\/(\d+)\/thread\/(\d+)$/)
    const forumId = positiveInteger(match?.[1])
    const threadId = positiveInteger(match?.[2])

    return { valid: Boolean(forumId && threadId === id), forumId }
  }

  const match = url.pathname.match(/^\/resources\/survey\/\d+\/(\d+)\/answer$/)
  return { valid: positiveInteger(match?.[1]) === id, forumId: null }
}

export function parseCStudioChamiloResource(
  metadata: CStudioChamiloResourceMetadata,
): CStudioChamiloResource | null {
  const tool = metadata.resourceTool.trim().toLowerCase()
  const keyMatch = metadata.resourceKey.trim().toLowerCase().match(/^([a-z_]+):(\d+)$/)
  const type = keyMatch?.[1] as CStudioChamiloResourceType | undefined
  const id = positiveInteger(keyMatch?.[2])

  if (!type || !RESOURCE_TYPES.has(type) || !id || !TOOL_TYPES[tool]?.has(type)) {
    return null
  }

  const launch = validateLaunchUrl(type, id, metadata.launchUrl.trim())
  if (!launch.valid) return null

  return {
    tool,
    type,
    id,
    title: metadata.title.trim() || "Chamilo content",
    launchUrl: metadata.launchUrl.trim(),
    forumId: launch.forumId,
  }
}

function text(root: ParentNode, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? ""
}

export function readCStudioChamiloResource(root: ParentNode): CStudioChamiloResource | null {
  return parseCStudioChamiloResource({
    resourceTool: text(root, ".chamiloResourceTool"),
    resourceKey: text(root, ".chamiloResourceKey"),
    title: text(root, ".chamiloResourceTitle"),
    launchUrl: text(root, ".datatext1"),
  })
}
