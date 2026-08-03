export type OfflineStoreName = "profiles" | "snapshots" | "operations" | "responses"

export type OfflineStorageErrorKind =
  | "unsupported"
  | "open_failed"
  | "read_failed"
  | "write_failed"
  | "delete_failed"

export class OfflineStorageError extends Error {
  constructor(
    public readonly kind: OfflineStorageErrorKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "OfflineStorageError"
  }
}

export interface OfflineDatabase {
  get<TRecord>(storeName: OfflineStoreName, key: string): Promise<TRecord | null>
  getAll<TRecord>(storeName: OfflineStoreName): Promise<TRecord[]>
  put<TRecord>(storeName: OfflineStoreName, record: TRecord): Promise<void>
  delete(storeName: OfflineStoreName, key: string): Promise<void>
  clearStoreCampus(storeName: OfflineStoreName, campusId: string): Promise<void>
  clearCampus(campusId: string): Promise<void>
}
