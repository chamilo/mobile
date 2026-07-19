import { ref } from "vue"
import { defineStore } from "pinia"

import type { CampusBranding } from "@/domain/branding/types"
import type { CampusProfile } from "@/domain/campus/types"
import { browserCampusBrandingRepository } from "@/services/branding/BrowserCampusBrandingRepository"
import type { CampusBrandingRepository } from "@/services/branding/CampusBrandingRepository"
import { PlatformBrandingApiService } from "@/services/branding/PlatformBrandingApiService"
import { createHttpClient } from "@/services/http/createHttpClient"

export type BrandingStatus = "idle" | "loading" | "ready" | "error"
export type BrandingApi = Pick<PlatformBrandingApiService, "getBranding">
export type BrandingApiFactory = (campus: CampusProfile) => BrandingApi

let repository: CampusBrandingRepository = browserCampusBrandingRepository
let apiFactory: BrandingApiFactory = (campus) =>
  new PlatformBrandingApiService(createHttpClient(campus), campus)

export function setBrandingDependenciesForTests(
  testRepository: CampusBrandingRepository,
  testApiFactory: BrandingApiFactory,
): void {
  repository = testRepository
  apiFactory = testApiFactory
}

export function resetBrandingDependencies(): void {
  repository = browserCampusBrandingRepository
  apiFactory = (campus) => new PlatformBrandingApiService(createHttpClient(campus), campus)
}

export const useBrandingStore = defineStore("branding", () => {
  const status = ref<BrandingStatus>("idle")
  const campusId = ref<string | null>(null)
  const branding = ref<CampusBranding | null>(null)
  let requestSequence = 0

  async function load(campus: CampusProfile): Promise<boolean> {
    const requestId = ++requestSequence
    campusId.value = campus.id

    const cachedBranding = (() => {
      try {
        return repository.load(campus.id)?.data ?? null
      } catch {
        return null
      }
    })()

    branding.value = cachedBranding
    status.value = cachedBranding ? "ready" : "loading"

    try {
      const remoteBranding = await apiFactory(campus).getBranding()

      if (requestId !== requestSequence || campusId.value !== campus.id) {
        return false
      }

      branding.value = remoteBranding
      status.value = "ready"

      try {
        repository.save(campus.id, remoteBranding)
      } catch {
        // Branding cache is optional; the fresh value remains usable.
      }

      return true
    } catch {
      if (requestId !== requestSequence || campusId.value !== campus.id) {
        return false
      }

      status.value = cachedBranding ? "ready" : "error"
      return Boolean(cachedBranding)
    }
  }

  function reset(): void {
    requestSequence += 1
    status.value = "idle"
    campusId.value = null
    branding.value = null
  }

  return {
    status,
    campusId,
    branding,
    load,
    reset,
  }
})
