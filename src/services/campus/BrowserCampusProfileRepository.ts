import {
  CampusRepositoryError,
  type CampusProfileRepository,
  type CampusRepositorySnapshot,
} from "@/services/campus/CampusProfileRepository"

const STORAGE_KEY = "chamilo-mobile/campuses/v1"

const emptySnapshot = (): CampusRepositorySnapshot => ({
  version: 1,
  profiles: [],
  selectedCampusId: null,
})

function isSnapshot(value: unknown): value is CampusRepositorySnapshot {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<CampusRepositorySnapshot>

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.profiles) &&
    (typeof candidate.selectedCampusId === "string" || candidate.selectedCampusId === null)
  )
}

export class BrowserCampusProfileRepository implements CampusProfileRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): CampusRepositorySnapshot {
    try {
      const serialized = this.storage.getItem(STORAGE_KEY)

      if (!serialized) {
        return emptySnapshot()
      }

      const snapshot: unknown = JSON.parse(serialized)

      if (!isSnapshot(snapshot)) {
        throw new Error("Unsupported campus repository format.")
      }

      return structuredClone(snapshot)
    } catch (error) {
      throw new CampusRepositoryError("load", error)
    }
  }

  save(snapshot: CampusRepositorySnapshot): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch (error) {
      throw new CampusRepositoryError("save", error)
    }
  }
}

export const browserCampusProfileRepository = new BrowserCampusProfileRepository()
