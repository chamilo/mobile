export type ForumLearningPathEntry = "forum" | "thread"

export interface ForumLearningPathContext {
  origin: "learnpath"
  entry: ForumLearningPathEntry
  learningPathId: number
  learningPathItemId: number
  learningPathTitle: string
  groupId: number
}

export interface LearningPathForumLaunch {
  forumId: number
  context: ForumLearningPathContext
}

export interface LearningPathThreadLaunch {
  forumId: number
  threadId: number
  context: ForumLearningPathContext
}

interface ForumLearningPathRouteInput {
  origin?: string | null
  learningPathEntry?: string | null
  learningPathId?: string | null
  learningPathItemId?: string | null
  learningPathTitle?: string | null
  groupId?: string | null
}

function positiveInteger(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function nonNegativeInteger(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return 0
  if (!/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function entry(value: string | null | undefined): ForumLearningPathEntry | null {
  return value === "forum" || value === "thread" ? value : null
}

export function hasForumLearningPathRouteContext(input: ForumLearningPathRouteInput): boolean {
  return (
    input.origin != null ||
    input.learningPathEntry != null ||
    input.learningPathId != null ||
    input.learningPathItemId != null ||
    input.learningPathTitle != null ||
    input.groupId != null
  )
}

export function parseForumLearningPathRouteContext(
  input: ForumLearningPathRouteInput,
): ForumLearningPathContext | null {
  if (!hasForumLearningPathRouteContext(input)) return null
  if (input.origin !== "learnpath") return null

  const learningPathEntry = entry(input.learningPathEntry)
  const learningPathId = positiveInteger(input.learningPathId)
  const learningPathItemId = positiveInteger(input.learningPathItemId)
  const groupId = nonNegativeInteger(input.groupId)

  if (!learningPathEntry || !learningPathId || !learningPathItemId || groupId === null) return null

  return {
    origin: "learnpath",
    entry: learningPathEntry,
    learningPathId,
    learningPathItemId,
    learningPathTitle: input.learningPathTitle?.trim() ?? "",
    groupId,
  }
}

export function buildForumLearningPathRouteQuery(
  context: ForumLearningPathContext | null | undefined,
): Record<string, string | number> {
  if (!context) return {}

  return {
    origin: "learnpath",
    learningPathEntry: context.entry,
    learningPathId: context.learningPathId,
    learningPathItemId: context.learningPathItemId,
    ...(context.learningPathTitle ? { learningPathTitle: context.learningPathTitle } : {}),
    ...(context.groupId > 0 ? { gid: context.groupId } : {}),
  }
}

export function buildForumLearningPathApiQuery(
  context: ForumLearningPathContext | null | undefined,
): Record<string, number> {
  return context?.groupId && context.groupId > 0 ? { gid: context.groupId } : {}
}

function parseBaseContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  expectedCourseId: number,
  expectedSessionId: number | null,
): { url: URL; groupId: number } | null {
  if (
    !contentUrl ||
    expectedLearningPathId <= 0 ||
    expectedLearningPathItemId <= 0 ||
    expectedCourseId <= 0
  ) {
    return null
  }

  let url: URL
  try {
    url = new URL(contentUrl, "https://mobile.invalid")
  } catch {
    return null
  }

  if (url.origin !== "https://mobile.invalid") return null

  const learningPathId = positiveInteger(url.searchParams.get("lp_id"))
  const itemId = positiveInteger(url.searchParams.get("item_id"))
  const linkedItemId = positiveInteger(url.searchParams.get("lp_item_id"))
  const courseId = positiveInteger(url.searchParams.get("cid"))
  const sessionId = nonNegativeInteger(url.searchParams.get("sid"))
  const groupId = nonNegativeInteger(url.searchParams.get("gid"))

  if (
    learningPathId !== expectedLearningPathId ||
    itemId !== expectedLearningPathItemId ||
    linkedItemId !== expectedLearningPathItemId ||
    courseId !== expectedCourseId ||
    sessionId !== (expectedSessionId ?? 0) ||
    groupId === null ||
    url.searchParams.get("origin") !== "learnpath" ||
    url.searchParams.get("returnToLp") !== "1" ||
    url.searchParams.get("embedded") !== "1" ||
    url.searchParams.get("type") !== "step"
  ) {
    return null
  }

  return { url, groupId }
}

export function parseLearningPathForumContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  expectedCourseId: number,
  expectedSessionId: number | null,
  learningPathTitle: string,
): LearningPathForumLaunch | null {
  const parsed = parseBaseContentUrl(
    contentUrl,
    expectedLearningPathId,
    expectedLearningPathItemId,
    expectedCourseId,
    expectedSessionId,
  )
  if (!parsed) return null

  const match = parsed.url.pathname.match(/^\/resources\/forum\/\d+\/forum\/(\d+)$/)
  const forumId = positiveInteger(match?.[1])
  if (!forumId) return null

  return {
    forumId,
    context: {
      origin: "learnpath",
      entry: "forum",
      learningPathId: expectedLearningPathId,
      learningPathItemId: expectedLearningPathItemId,
      learningPathTitle: learningPathTitle.trim(),
      groupId: parsed.groupId,
    },
  }
}

export function parseLearningPathThreadContentUrl(
  contentUrl: string | null,
  expectedLearningPathId: number,
  expectedLearningPathItemId: number,
  expectedCourseId: number,
  expectedSessionId: number | null,
  learningPathTitle: string,
): LearningPathThreadLaunch | null {
  const parsed = parseBaseContentUrl(
    contentUrl,
    expectedLearningPathId,
    expectedLearningPathItemId,
    expectedCourseId,
    expectedSessionId,
  )
  if (!parsed) return null

  const match = parsed.url.pathname.match(
    /^\/resources\/forum\/\d+\/forum\/(\d+)\/thread\/(\d+)$/,
  )
  const forumId = positiveInteger(match?.[1])
  const threadId = positiveInteger(match?.[2])
  if (!forumId || !threadId) return null

  return {
    forumId,
    threadId,
    context: {
      origin: "learnpath",
      entry: "thread",
      learningPathId: expectedLearningPathId,
      learningPathItemId: expectedLearningPathItemId,
      learningPathTitle: learningPathTitle.trim(),
      groupId: parsed.groupId,
    },
  }
}
