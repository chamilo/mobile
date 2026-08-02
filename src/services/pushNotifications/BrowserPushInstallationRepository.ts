const STORAGE_KEY_PREFIX = "chamilo.mobile.campus"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface StoredPushInstallation {
  version: 1
  installationId: string
  userId: number | null
  registeredAt: string | null
}

export interface PushInstallationRegistration {
  installationId: string
  userId: number
  registeredAt: string | null
}

export interface PushInstallationRepository {
  load(campusId: string): PushInstallationRegistration | null
  prepare(campusId: string, userId: number): PushInstallationRegistration
  markRegistered(campusId: string, userId: number): void
  clearRegistration(campusId: string): void
}

export class PushInstallationStorageError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "PushInstallationStorageError"
  }
}

type InstallationStorage = Pick<Storage, "getItem" | "setItem">

function storageKey(campusId: string): string {
  return `${STORAGE_KEY_PREFIX}/${encodeURIComponent(campusId)}/push-installation.v1`
}

function isStoredPushInstallation(value: unknown): value is StoredPushInstallation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const state = value as Partial<StoredPushInstallation>

  return (
    state.version === 1 &&
    typeof state.installationId === "string" &&
    UUID_PATTERN.test(state.installationId) &&
    (state.userId === null ||
      (typeof state.userId === "number" && Number.isInteger(state.userId) && state.userId > 0)) &&
    (state.registeredAt === null || typeof state.registeredAt === "string")
  )
}

function createInstallationId(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new PushInstallationStorageError(
      "A secure installation identifier could not be generated.",
    )
  }

  return globalThis.crypto.randomUUID()
}

export class BrowserPushInstallationRepository implements PushInstallationRepository {
  constructor(
    private readonly storage: InstallationStorage = window.localStorage,
    private readonly uuidFactory: () => string = createInstallationId,
  ) {}

  load(campusId: string): PushInstallationRegistration | null {
    const state = this.read(campusId)

    if (!state || state.userId === null) {
      return null
    }

    return {
      installationId: state.installationId,
      userId: state.userId,
      registeredAt: state.registeredAt,
    }
  }

  prepare(campusId: string, userId: number): PushInstallationRegistration {
    const current = this.read(campusId)
    const next: StoredPushInstallation = {
      version: 1,
      installationId: current?.installationId ?? this.uuidFactory(),
      userId,
      registeredAt: current?.userId === userId ? current.registeredAt : null,
    }

    if (!UUID_PATTERN.test(next.installationId)) {
      throw new PushInstallationStorageError("The generated installation identifier is invalid.")
    }

    this.write(campusId, next)

    return {
      installationId: next.installationId,
      userId,
      registeredAt: next.registeredAt,
    }
  }

  markRegistered(campusId: string, userId: number): void {
    const current = this.read(campusId)

    if (!current || current.userId !== userId) {
      throw new PushInstallationStorageError("The push installation session changed.")
    }

    this.write(campusId, {
      ...current,
      registeredAt: new Date().toISOString(),
    })
  }

  clearRegistration(campusId: string): void {
    const current = this.read(campusId)

    if (!current) {
      return
    }

    this.write(campusId, {
      ...current,
      userId: null,
      registeredAt: null,
    })
  }

  private read(campusId: string): StoredPushInstallation | null {
    try {
      const value = this.storage.getItem(storageKey(campusId))

      if (value === null) {
        return null
      }

      const parsed: unknown = JSON.parse(value)

      if (!isStoredPushInstallation(parsed)) {
        throw new PushInstallationStorageError("The stored push installation is invalid.")
      }

      return parsed
    } catch (error) {
      if (error instanceof PushInstallationStorageError) {
        throw error
      }

      throw new PushInstallationStorageError("The push installation could not be read.", error)
    }
  }

  private write(campusId: string, state: StoredPushInstallation): void {
    try {
      this.storage.setItem(storageKey(campusId), JSON.stringify(state))
    } catch (error) {
      throw new PushInstallationStorageError("The push installation could not be saved.", error)
    }
  }
}

export const browserPushInstallationRepository = new BrowserPushInstallationRepository()
