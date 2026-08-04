export interface OfflinePrefetchCapture {
  courseId: number | null
  strict: boolean
}

let activeCapture: OfflinePrefetchCapture | null = null

export function getOfflinePrefetchCapture(): OfflinePrefetchCapture | null {
  return activeCapture
}

export async function withOfflinePrefetchCapture<TValue>(
  capture: OfflinePrefetchCapture,
  action: () => Promise<TValue>,
): Promise<TValue> {
  if (activeCapture) {
    throw new Error("Another offline preparation operation is already active.")
  }

  activeCapture = capture

  try {
    return await action()
  } finally {
    activeCapture = null
  }
}
