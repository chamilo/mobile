import { clearNativeScormCampusPackages } from "@/services/learningPaths/NativeScormPackageHost"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"

export async function clearOfflineCampusData(campusId: string): Promise<void> {
  await Promise.all([
    indexedDbOfflineDatabase.clearCampus(campusId),
    clearNativeScormCampusPackages(campusId),
  ])
}
