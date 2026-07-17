import type { CourseLink, CourseLinkCategory, CourseLinksSnapshot } from "@/domain/links/types"
import { normalizeSafeExternalUrl, UnsafeExternalUrlError } from "@/domain/links/safeExternalUrl"

export class CourseLinksContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CourseLinksContractError"
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CourseLinksContractError(`${field} must be an object.`)
  }

  return value as Record<string, unknown>
}

function asInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new CourseLinksContractError(`${field} must be a positive integer.`)
  }

  return value
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLink(value: unknown, field: string): CourseLink {
  const item = asRecord(value, field)
  const iid = asInteger(item.iid ?? item.id, `${field}.iid`)
  const title = stringOrEmpty(item.title) || `Link ${iid}`
  const rawUrl = stringOrEmpty(item.url)

  try {
    return {
      iid,
      title,
      description: stringOrEmpty(item.description),
      url: normalizeSafeExternalUrl(rawUrl),
      target: stringOrEmpty(item.target) || null,
      position: nullableInteger(item.position),
      sessionId: nullableInteger(item.sessionId),
    }
  } catch (error) {
    if (error instanceof UnsafeExternalUrlError) {
      throw new CourseLinksContractError(`${field}.url is unsafe.`)
    }

    throw error
  }
}

function normalizeUncategorized(value: unknown): CourseLink[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new CourseLinksContractError("linksWithoutCategory must be an array.")
  }

  return value
    .map((item, index) => normalizeLink(item, `linksWithoutCategory[${index}]`))
    .sort(compareLinks)
}

function normalizeCategories(value: unknown): CourseLinkCategory[] {
  if (value === undefined) return []

  const rawCategories: unknown[] = Array.isArray(value)
    ? value
    : Object.values(asRecord(value, "categories"))

  return rawCategories
    .map((rawCategory, index) => {
      const category = asRecord(rawCategory, `categories[${index}]`)
      const info = asRecord(category.info, `categories[${index}].info`)
      const iid = asInteger(info.id ?? info.iid, `categories[${index}].info.id`)
      const rawLinks = category.links ?? []

      if (!Array.isArray(rawLinks)) {
        throw new CourseLinksContractError(`categories[${index}].links must be an array.`)
      }

      return {
        iid,
        title: stringOrEmpty(info.title) || `Category ${iid}`,
        description: stringOrEmpty(info.description),
        links: rawLinks
          .map((item, linkIndex) => normalizeLink(item, `categories[${index}].links[${linkIndex}]`))
          .sort(compareLinks),
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title))
}

function compareLinks(left: CourseLink, right: CourseLink): number {
  if (left.position !== null && right.position !== null && left.position !== right.position) {
    return left.position - right.position
  }

  if (left.position !== null && right.position === null) return -1
  if (left.position === null && right.position !== null) return 1

  return left.title.localeCompare(right.title)
}

export function normalizeCourseLinksResponse(value: unknown): CourseLinksSnapshot {
  const response = asRecord(value, "response")
  const uncategorized = normalizeUncategorized(response.linksWithoutCategory)
  const categories = normalizeCategories(response.categories)
  const totalItems =
    uncategorized.length + categories.reduce((total, category) => total + category.links.length, 0)

  return {
    uncategorized,
    categories,
    totalItems,
  }
}
