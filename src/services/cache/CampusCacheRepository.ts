import type { CoursesOverview } from "@/domain/courses/types"

export interface CacheRecord<TData> {
  version: 1
  savedAt: string
  data: TData
}

export interface CampusCacheRepository {
  loadCourses(campusId: string, userId: number): CacheRecord<CoursesOverview> | null
  saveCourses(campusId: string, userId: number, overview: CoursesOverview): void
  clearCampus(campusId: string): void
}

export class CampusCacheError extends Error {
  constructor(
    public readonly operation: "load" | "save" | "clear",
    public readonly originalError: unknown,
  ) {
    super(`Campus cache ${operation} failed.`)
    this.name = "CampusCacheError"
  }
}
