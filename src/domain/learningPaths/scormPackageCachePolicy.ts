export interface ScormPackageCachePolicyInput {
  isCStudioContent: boolean
  offline: boolean
  campusAvailable: boolean
}

export function shouldReuseScormPackageCache({
  isCStudioContent,
  offline,
  campusAvailable,
}: ScormPackageCachePolicyInput): boolean {
  if (!isCStudioContent) return true

  return offline || !campusAvailable
}
