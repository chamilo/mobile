import {
  type OfflineDatabase,
  type OfflineStoreName,
  OfflineStorageError,
} from "@/services/offline/OfflineDatabase"

const DATABASE_NAME = "chamilo-mobile-offline-v2"
const DATABASE_VERSION = 2
const STORE_NAMES: OfflineStoreName[] = ["profiles", "snapshots", "operations", "responses"]

interface CampusScopedRecord {
  campusId?: unknown
}

function requestResult<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true })
    request.addEventListener("error", () => reject(request.error), { once: true })
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true })
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")),
      { once: true },
    )
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    )
  })
}

export class IndexedDbOfflineDatabase implements OfflineDatabase {
  private databasePromise: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise
    }

    if (!globalThis.indexedDB) {
      return Promise.reject(
        new OfflineStorageError(
          "unsupported",
          "Structured offline storage is unavailable on this platform.",
        ),
      )
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.addEventListener("upgradeneeded", () => {
        const database = request.result

        for (const storeName of STORE_NAMES) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName, {
              keyPath: storeName === "operations" ? "id" : "key",
            })
          }
        }
      })

      request.addEventListener(
        "success",
        () => {
          const database = request.result
          database.addEventListener("versionchange", () => {
            database.close()
            this.databasePromise = null
          })
          resolve(database)
        },
        { once: true },
      )

      request.addEventListener(
        "blocked",
        () => {
          this.databasePromise = null
          reject(
            new OfflineStorageError(
              "open_failed",
              "Offline storage is blocked by another application instance.",
            ),
          )
        },
        { once: true },
      )

      request.addEventListener(
        "error",
        () => {
          this.databasePromise = null
          reject(
            new OfflineStorageError(
              "open_failed",
              "Offline storage could not be opened.",
              request.error,
            ),
          )
        },
        { once: true },
      )
    })

    return this.databasePromise
  }

  async get<TRecord>(storeName: OfflineStoreName, key: string): Promise<TRecord | null> {
    try {
      const database = await this.open()
      const transaction = database.transaction(storeName, "readonly")
      const done = transactionDone(transaction)
      const result = await requestResult(transaction.objectStore(storeName).get(key))
      await done

      return (result as TRecord | undefined) ?? null
    } catch (error) {
      if (error instanceof OfflineStorageError) throw error
      throw new OfflineStorageError("read_failed", "Offline data could not be read.", error)
    }
  }

  async getAll<TRecord>(storeName: OfflineStoreName): Promise<TRecord[]> {
    try {
      const database = await this.open()
      const transaction = database.transaction(storeName, "readonly")
      const done = transactionDone(transaction)
      const result = await requestResult(transaction.objectStore(storeName).getAll())
      await done

      return result as TRecord[]
    } catch (error) {
      if (error instanceof OfflineStorageError) throw error
      throw new OfflineStorageError("read_failed", "Offline data could not be listed.", error)
    }
  }

  async put<TRecord>(storeName: OfflineStoreName, record: TRecord): Promise<void> {
    try {
      const database = await this.open()
      const transaction = database.transaction(storeName, "readwrite")
      const done = transactionDone(transaction)
      transaction.objectStore(storeName).put(structuredClone(record))
      await done
    } catch (error) {
      if (error instanceof OfflineStorageError) throw error
      throw new OfflineStorageError("write_failed", "Offline data could not be saved.", error)
    }
  }

  async delete(storeName: OfflineStoreName, key: string): Promise<void> {
    try {
      const database = await this.open()
      const transaction = database.transaction(storeName, "readwrite")
      const done = transactionDone(transaction)
      transaction.objectStore(storeName).delete(key)
      await done
    } catch (error) {
      if (error instanceof OfflineStorageError) throw error
      throw new OfflineStorageError("delete_failed", "Offline data could not be removed.", error)
    }
  }

  async clearStoreCampus(storeName: OfflineStoreName, campusId: string): Promise<void> {
    try {
      const database = await this.open()
      const transaction = database.transaction(storeName, "readwrite")
      const done = transactionDone(transaction)
      const request = transaction.objectStore(storeName).openCursor()

      request.addEventListener("success", () => {
        const cursor = request.result
        if (!cursor) return

        const record = cursor.value as CampusScopedRecord
        if (record.campusId === campusId) cursor.delete()
        cursor.continue()
      })

      await done
    } catch (error) {
      if (error instanceof OfflineStorageError) throw error
      throw new OfflineStorageError(
        "delete_failed",
        "Campus offline data could not be removed.",
        error,
      )
    }
  }

  async clearCampus(campusId: string): Promise<void> {
    for (const storeName of STORE_NAMES) {
      await this.clearStoreCampus(storeName, campusId)
    }
  }
}

export const indexedDbOfflineDatabase = new IndexedDbOfflineDatabase()
