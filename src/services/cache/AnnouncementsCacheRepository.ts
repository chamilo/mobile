import type {
  AnnouncementDetailSnapshot,
  AnnouncementListSnapshot,
} from "@/domain/announcements/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { CacheRecord } from "@/services/cache/CampusCacheRepository"

export interface AnnouncementsCacheRepository {
  loadList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): CacheRecord<AnnouncementListSnapshot> | null
  saveList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    snapshot: AnnouncementListSnapshot,
  ): void
  loadDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    announcementId: number,
  ): CacheRecord<AnnouncementDetailSnapshot> | null
  saveDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    snapshot: AnnouncementDetailSnapshot,
  ): void
}
