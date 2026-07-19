import { computed, ref } from "vue"
import { defineStore } from "pinia"

import { createCampusId } from "@/domain/campus/createCampusId"
import { normalizeCampusProfileInput } from "@/domain/campus/normalizeCampusUrl"
import type { CampusProfile, CampusProfileInput, CampusProfileUpdate } from "@/domain/campus/types"
import { browserCampusProfileRepository } from "@/services/campus/BrowserCampusProfileRepository"
import type { CampusProfileRepository } from "@/services/campus/CampusProfileRepository"

export type CampusStoreErrorCode = "load_failed" | "save_failed"

let repository: CampusProfileRepository = browserCampusProfileRepository

export function setCampusProfileRepositoryForTests(testRepository: CampusProfileRepository): void {
  repository = testRepository
}

export function resetCampusProfileRepository(): void {
  repository = browserCampusProfileRepository
}

export const useCampusStore = defineStore("campus", () => {
  const profiles = ref<CampusProfile[]>([])
  const selectedCampusId = ref<string | null>(null)
  const initialized = ref(false)
  const errorCode = ref<CampusStoreErrorCode | null>(null)

  const selectedCampus = computed(
    () => profiles.value.find((profile) => profile.id === selectedCampusId.value) ?? null,
  )

  function saveState(nextProfiles: CampusProfile[], nextSelectedCampusId: string | null): boolean {
    try {
      repository.save({
        version: 1,
        profiles: nextProfiles.map((profile) => ({ ...profile })),
        selectedCampusId: nextSelectedCampusId,
      })
      profiles.value = nextProfiles
      selectedCampusId.value = nextSelectedCampusId
      errorCode.value = null

      return true
    } catch {
      errorCode.value = "save_failed"

      return false
    }
  }

  function initialize(): void {
    try {
      const snapshot = repository.load()
      profiles.value = snapshot.profiles
      selectedCampusId.value = snapshot.profiles.some(
        (profile) => profile.id === snapshot.selectedCampusId,
      )
        ? snapshot.selectedCampusId
        : null
      errorCode.value = null
    } catch {
      profiles.value = []
      selectedCampusId.value = null
      errorCode.value = "load_failed"
    } finally {
      initialized.value = true
    }
  }

  function addCampus(input: CampusProfileInput): CampusProfile | null {
    const normalizedInput = normalizeCampusProfileInput(input)
    const now = new Date().toISOString()
    const profile: CampusProfile = {
      id: createCampusId(),
      ...normalizedInput,
      compatibilityStatus: "unknown",
      compatibilityCheckedAt: null,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    }

    return saveState([...profiles.value, profile], profile.id) ? profile : null
  }

  function updateCampus(id: string, input: CampusProfileUpdate): CampusProfile | null {
    const currentProfile = profiles.value.find((profile) => profile.id === id)

    if (!currentProfile) {
      return null
    }

    const updatedProfile: CampusProfile = {
      ...currentProfile,
      ...normalizeCampusProfileInput(input),
      compatibilityStatus: "unknown",
      compatibilityCheckedAt: null,
      updatedAt: new Date().toISOString(),
    }
    const nextProfiles = profiles.value.map((profile) =>
      profile.id === id ? updatedProfile : profile,
    )

    return saveState(nextProfiles, selectedCampusId.value) ? updatedProfile : null
  }

  function selectCampus(id: string): boolean {
    if (!profiles.value.some((profile) => profile.id === id)) {
      return false
    }

    const now = new Date().toISOString()
    const nextProfiles = profiles.value.map((profile) =>
      profile.id === id ? { ...profile, lastUsedAt: now } : profile,
    )

    return saveState(nextProfiles, id)
  }

  function removeCampus(id: string): boolean {
    if (!profiles.value.some((profile) => profile.id === id)) {
      return false
    }

    const nextProfiles = profiles.value.filter((profile) => profile.id !== id)
    const nextSelectedCampusId = selectedCampusId.value === id ? null : selectedCampusId.value

    return saveState(nextProfiles, nextSelectedCampusId)
  }

  function clearError(): void {
    errorCode.value = null
  }

  return {
    profiles,
    selectedCampusId,
    selectedCampus,
    initialized,
    errorCode,
    initialize,
    addCampus,
    updateCampus,
    selectCampus,
    removeCampus,
    clearError,
  }
})
