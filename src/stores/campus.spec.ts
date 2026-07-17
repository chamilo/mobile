import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"

import type {
  CampusProfileRepository,
  CampusRepositorySnapshot,
} from "@/services/campus/CampusProfileRepository"
import {
  resetCampusProfileRepository,
  setCampusProfileRepositoryForTests,
  useCampusStore,
} from "@/stores/campus"

class MemoryCampusRepository implements CampusProfileRepository {
  snapshot: CampusRepositorySnapshot = {
    version: 1,
    profiles: [],
    selectedCampusId: null,
  }

  load(): CampusRepositorySnapshot {
    return structuredClone(this.snapshot)
  }

  save(snapshot: CampusRepositorySnapshot): void {
    this.snapshot = structuredClone(snapshot)
  }
}

describe("campus store", () => {
  let repository: MemoryCampusRepository

  beforeEach(() => {
    repository = new MemoryCampusRepository()
    setCampusProfileRepositoryForTests(repository)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetCampusProfileRepository()
  })

  it("adds and automatically selects a normalized campus", () => {
    const store = useCampusStore()
    store.initialize()

    const campus = store.addCampus({
      displayName: " Local campus ",
      baseUrl: "chamilo2.local/",
    })

    expect(campus?.displayName).toBe("Local campus")
    expect(campus?.baseUrl).toBe("https://chamilo2.local")
    expect(store.selectedCampusId).toBe(campus?.id)
    expect(repository.snapshot.profiles).toHaveLength(1)
  })

  it("keeps campuses isolated while changing the selection", () => {
    const store = useCampusStore()
    store.initialize()

    const first = store.addCampus({ displayName: "First", baseUrl: "first.local" })
    const second = store.addCampus({ displayName: "Second", baseUrl: "second.local" })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(store.selectCampus(first?.id ?? "")).toBe(true)
    expect(store.selectedCampus?.displayName).toBe("First")
    expect(store.profiles).toHaveLength(2)
  })

  it("clears the selection when the selected campus is removed", () => {
    const store = useCampusStore()
    store.initialize()
    const campus = store.addCampus({ displayName: "Local", baseUrl: "local.local" })

    expect(store.removeCampus(campus?.id ?? "")).toBe(true)
    expect(store.selectedCampusId).toBeNull()
    expect(store.profiles).toHaveLength(0)
  })
})
