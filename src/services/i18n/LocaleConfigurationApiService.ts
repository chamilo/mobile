import {
  normalizeCourseLocaleConfiguration,
  normalizeLanguageCatalog,
  normalizePlatformLocaleConfiguration,
} from "@/domain/i18n/contracts"
import type {
  CourseLocaleConfiguration,
  LanguageCatalog,
  PlatformLocaleConfiguration,
} from "@/domain/i18n/types"
import type { HttpClient } from "@/services/http/HttpClient"

export class LocaleConfigurationApiService {
  constructor(private readonly httpClient: HttpClient) {}

  async getPlatformConfiguration(): Promise<PlatformLocaleConfiguration> {
    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: "/platform-config/list",
      headers: { Accept: "application/json" },
    })

    return normalizePlatformLocaleConfiguration(response.data)
  }

  async getAvailableLanguages(): Promise<LanguageCatalog> {
    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: "/api/languages",
      headers: { Accept: "application/ld+json" },
    })

    return normalizeLanguageCatalog(response.data)
  }

  async getCourseConfiguration(courseId: number): Promise<CourseLocaleConfiguration> {
    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new Error("Course ID must be a positive integer.")
    }

    const response = await this.httpClient.request<unknown>({
      method: "GET",
      path: "/platform-config/list/course_settings",
      query: { cid: courseId },
      headers: { Accept: "application/json" },
    })

    return normalizeCourseLocaleConfiguration(response.data)
  }
}
