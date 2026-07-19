export type CampusSessionDataCleaner = (campusId: string) => void | Promise<void>

const cleaners = new Set<CampusSessionDataCleaner>()

export function registerCampusSessionDataCleaner(cleaner: CampusSessionDataCleaner): () => void {
  cleaners.add(cleaner)

  return () => cleaners.delete(cleaner)
}

export async function clearCampusSessionData(campusId: string): Promise<void> {
  const results = await Promise.allSettled([...cleaners].map((cleaner) => cleaner(campusId)))
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  )

  if (rejected) {
    throw rejected.reason
  }
}
