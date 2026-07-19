import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  ForumAttachmentSummary,
  ForumAvailabilityStatus,
  ForumCategoryGroup,
  ForumCategorySummary,
  ForumCollection,
  ForumPostSummary,
  ForumSummary,
  ForumThreadDetail,
  ForumThreadSummary,
  ForumThreadsCollection,
} from "@/domain/forums/types"

export class ForumContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ForumContractError"
  }
}

type UnknownRecord = Record<string, unknown>

export interface ForumRequestDefinition {
  path: string
  query: Record<string, string | number | boolean>
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function asPositiveInteger(value: unknown, field: string): number {
  const parsed = asNumber(value)

  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new ForumContractError(`Invalid ${field}.`)
  }

  return parsed
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (value === 1 || value === "1" || value === "true") return true
  return false
}

function asNullableText(value: unknown): string | null {
  const normalized = asText(value)
  return normalized || null
}

function asCount(value: unknown): number {
  if (Array.isArray(value)) return value.length

  const count = asNumber(value)
  return count === null ? 0 : Math.max(0, Math.trunc(count))
}

function collectionItems(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value

  if (!isRecord(value)) {
    throw new ForumContractError(`The ${label} response is not a collection.`)
  }

  if (Array.isArray(value["hydra:member"])) return value["hydra:member"]
  if (Array.isArray(value.member)) return value.member
  if (Array.isArray(value.items)) return value.items

  throw new ForumContractError(`The ${label} response has no collection members.`)
}

function idFromIri(value: unknown): number | null {
  const direct = asNumber(value)
  if (direct !== null && Number.isInteger(direct) && direct > 0) return direct

  const iri = asText(value)
  if (!iri) return null

  const parts = iri.split("/").filter(Boolean)
  const lastPart = parts[parts.length - 1]
  const parsed = lastPart ? Number(lastPart) : Number.NaN

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function plainText(value: unknown): string {
  const html = asText(value)
  if (!html) return ""

  return decodeBasicEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function availabilityStatus(value: unknown): ForumAvailabilityStatus {
  const status = asText(value)

  if (status === "open" || status === "not_started" || status === "closed") {
    return status
  }

  return "unknown"
}

function sessionQuery(context: CourseNavigationContext): Record<string, number> {
  return context.sessionId ? { sid: context.sessionId } : {}
}

export function buildForumCategoriesRequest(
  context: CourseNavigationContext,
  courseResourceNodeId: number,
): ForumRequestDefinition {
  return {
    path: "/api/forum_categories",
    query: {
      cid: context.courseId,
      "resourceNode.parent": asPositiveInteger(courseResourceNodeId, "course resource node id"),
      ...sessionQuery(context),
      itemsPerPage: 5000,
      "order[iid]": "asc",
    },
  }
}

export function buildForumsRequest(
  context: CourseNavigationContext,
  courseResourceNodeId: number,
): ForumRequestDefinition {
  return {
    path: "/api/forums",
    query: {
      cid: context.courseId,
      "resourceNode.parent": asPositiveInteger(courseResourceNodeId, "course resource node id"),
      ...sessionQuery(context),
      itemsPerPage: 5000,
      "order[iid]": "asc",
    },
  }
}

export function buildForumThreadsRequest(
  context: CourseNavigationContext,
  forumId: number,
): ForumRequestDefinition {
  const normalizedForumId = asPositiveInteger(forumId, "forum id")

  return {
    path: "/api/forum_threads",
    query: {
      forum: `/api/forums/${normalizedForumId}`,
      cid: context.courseId,
      ...sessionQuery(context),
      itemsPerPage: 5000,
      "order[threadSticky]": "desc",
      "order[threadDate]": "desc",
      "order[iid]": "desc",
    },
  }
}

export function buildForumThreadRequest(
  context: CourseNavigationContext,
  forumId: number,
  threadId: number,
): ForumRequestDefinition {
  return {
    path: `/api/forum_threads/${asPositiveInteger(threadId, "thread id")}/posts`,
    query: {
      cid: context.courseId,
      forumId: asPositiveInteger(forumId, "forum id"),
      ...sessionQuery(context),
    },
  }
}

function normalizeCategory(item: unknown): ForumCategorySummary {
  if (!isRecord(item)) {
    throw new ForumContractError("A forum category is invalid.")
  }

  return {
    id: asPositiveInteger(item.iid ?? item["@id"], "forum category id"),
    title: asText(item.title) || "Forum category",
    description: plainText(item.catComment),
    locked: asBoolean(item.locked),
    visible: item.forumCategoryVisible === undefined || asBoolean(item.forumCategoryVisible),
    position: asNumber(item.position) ?? 0,
  }
}

function normalizeForum(
  item: unknown,
  categoryById: Map<number, ForumCategorySummary>,
): ForumSummary {
  if (!isRecord(item)) {
    throw new ForumContractError("A forum is invalid.")
  }

  const categoryId = idFromIri(item.forumCategory)
  const category = categoryId === null ? null : (categoryById.get(categoryId) ?? null)

  return {
    id: asPositiveInteger(item.iid ?? item["@id"], "forum id"),
    title: asText(item.title) || "Forum",
    description: plainText(item.forumComment),
    categoryId,
    categoryTitle: category?.title ?? null,
    threadCount: asCount(item.forumThreads),
    postCount: asCount(item.forumPosts),
    locked: asBoolean(item.locked),
    visible: item.forumVisible === undefined || asBoolean(item.forumVisible),
    availabilityStatus: availabilityStatus(item.availabilityStatus),
    groupForum: (asNumber(item.forumOfGroup) ?? 0) > 0,
    moderated: asBoolean(item.moderated),
    allowNewThreads: asBoolean(item.allowNewThreads),
    subscribed: asBoolean(item.subscribed),
    canSubscribe: asBoolean(item.canSubscribe),
    startTime: asNullableText(item.startTime),
    endTime: asNullableText(item.endTime),
  }
}

export function normalizeForumCollection(
  categoryResponse: unknown,
  forumResponse: unknown,
): ForumCollection {
  const categories = collectionItems(categoryResponse, "forum categories")
    .map(normalizeCategory)
    .sort((left, right) => left.position - right.position || left.id - right.id)

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const forums = collectionItems(forumResponse, "forums").map((item) =>
    normalizeForum(item, categoryById),
  )

  const categorizedForumIds = new Set<number>()
  const grouped: ForumCategoryGroup[] = categories
    .map((category) => {
      const categoryForums = forums.filter((forum) => forum.categoryId === category.id)
      categoryForums.forEach((forum) => categorizedForumIds.add(forum.id))

      return {
        category,
        forums: categoryForums,
      }
    })
    .filter((group) => group.forums.length > 0)

  return {
    categories: grouped,
    uncategorized: forums.filter((forum) => !categorizedForumIds.has(forum.id)),
    totalItems: forums.length,
  }
}

function normalizeThread(item: unknown): ForumThreadSummary {
  if (!isRecord(item)) {
    throw new ForumContractError("A forum discussion is invalid.")
  }

  return {
    id: asPositiveInteger(item.iid ?? item["@id"], "forum thread id"),
    title: asText(item.title) || "Discussion",
    locked: asBoolean(item.locked),
    visible: item.threadVisible === undefined || asBoolean(item.threadVisible),
    sticky: asBoolean(item.threadSticky),
    replyCount: asCount(item.threadReplies),
    viewCount: asCount(item.threadViews),
    createdAt: asNullableText(item.threadDateIso ?? item.createdAtIso ?? item.threadDate),
    relativeTime: asNullableText(item.threadRelativeTime),
    posterFullName: asText(item.posterFullName),
    posterRoleLabel: asText(item.posterRoleLabel),
    lastPostTitle: asText(item.lastPostTitle),
    lastPostRelativeTime: asNullableText(item.lastPostRelativeTime),
    lastPosterFullName: asText(item.lastPosterFullName),
    subscribed: asBoolean(item.subscribed),
    canSubscribe: asBoolean(item.canSubscribe),
    gradebookEnabled: asBoolean(item.gradebookEnabled),
    lockedByGradebook: asBoolean(item.lockedByGradebook),
  }
}

export function normalizeForumThreads(
  value: unknown,
  expectedForumId: number,
): ForumThreadsCollection {
  const normalizedForumId = asPositiveInteger(expectedForumId, "forum id")
  const response = isRecord(value) ? value : {}
  const responseForumId = asNumber(response.forumId)

  if (responseForumId !== null && responseForumId > 0 && responseForumId !== normalizedForumId) {
    throw new ForumContractError("The forum discussions response does not match the route.")
  }

  const forum = isRecord(response.forum) ? response.forum : {}
  const items = collectionItems(value, "forum discussions").map(normalizeThread)
  const totalItems = asNumber(response["hydra:totalItems"] ?? response.totalItems) ?? items.length

  return {
    forumId: normalizedForumId,
    forumTitle: asText(forum.title),
    forumLocked: asBoolean(forum.locked),
    availabilityStatus: availabilityStatus(forum.availabilityStatus),
    allowNewThreads: asBoolean(forum.allowNewThreads),
    items,
    totalItems,
  }
}

function normalizeAttachment(item: unknown): ForumAttachmentSummary {
  if (!isRecord(item)) {
    throw new ForumContractError("A forum attachment is invalid.")
  }

  return {
    id: asPositiveInteger(item.iid, "forum attachment id"),
    filename: asText(item.filename) || "Attachment",
    size: asNumber(item.size),
    downloadUrl: asNullableText(item.downloadUrl),
  }
}

function normalizePost(item: unknown): ForumPostSummary {
  if (!isRecord(item)) {
    throw new ForumContractError("A forum post is invalid.")
  }

  return {
    id: asPositiveInteger(item.iid, "forum post id"),
    title: asText(item.title),
    text: plainText(item.postText),
    createdAt: asNullableText(item.postDateIso ?? item.createdAtIso ?? item.postDate),
    relativeTime: asNullableText(item.postRelativeTime),
    parentId: idFromIri(item.postParentId),
    visible: item.visible === undefined || asBoolean(item.visible),
    statusLabel: asText(item.statusLabel),
    posterFullName: asText(item.posterFullName),
    posterRoleLabel: asText(item.posterRoleLabel),
    attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment) : [],
  }
}

export function normalizeForumThreadDetail(
  value: unknown,
  expectedForumId: number,
  expectedThreadId: number,
): ForumThreadDetail {
  if (!isRecord(value)) {
    throw new ForumContractError("The forum thread response is invalid.")
  }

  const forum = isRecord(value.forum) ? value.forum : {}
  const thread = isRecord(value.thread) ? value.thread : {}

  const forumId = asPositiveInteger(forum.iid, "forum id")
  const threadId = asPositiveInteger(thread.iid, "forum thread id")

  if (forumId !== expectedForumId || threadId !== expectedThreadId) {
    throw new ForumContractError("The forum thread response does not match the route.")
  }

  return {
    forumId,
    forumTitle: asText(forum.title) || "Forum",
    forumLocked: asBoolean(forum.locked),
    availabilityStatus: availabilityStatus(forum.availabilityStatus),
    threadId,
    threadTitle: asText(thread.title) || "Discussion",
    threadLocked: asBoolean(thread.locked),
    threadSticky: asBoolean(thread.threadSticky),
    posterFullName: asText(thread.posterFullName),
    posterRoleLabel: asText(thread.posterRoleLabel),
    createdAt: asNullableText(thread.threadDateIso ?? thread.createdAtIso ?? thread.threadDate),
    relativeTime: asNullableText(thread.threadRelativeTime),
    canReply: asBoolean(value.canReply),
    posts: Array.isArray(value.posts) ? value.posts.map(normalizePost) : [],
  }
}
