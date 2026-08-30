import { clearScormCampusPackages } from "@/services/learningPaths/ScormPackageHost"
import { indexedDbOfflineDatabase } from "@/services/offline/IndexedDbOfflineDatabase"

export async function clearOfflineCampusData(campusId: string): Promise<void> {
  await Promise.all([
    indexedDbOfflineDatabase.clearCampus(campusId),
    clearScormCampusPackages(campusId),
  ])
}
