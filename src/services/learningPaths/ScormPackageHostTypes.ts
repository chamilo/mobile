import type { CourseNavigationContext } from "@/domain/courses/types"

export const MAX_NATIVE_SCORM_PACKAGE_SIZE_BYTES = 100 * 1024 * 1024
export const MAX_WEB_SCORM_PACKAGE_SIZE_BYTES = 512 * 1024 * 1024

export type ScormPackageHostErrorCode =
  | "unsupported_platform"
  | "plugin_unavailable"
  | "metadata_missing"
  | "runtime_disabled"
  | "too_large"
  | "fixture_mismatch"
  | "web_package_unsupported"
  | "install_failed"

export class ScormPackageHostError extends Error {
  constructor(
    public readonly code: ScormPackageHostErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "ScormPackageHostError"
  }
}

export interface ScormPackageHost {
  readonly maxPackageSizeBytes: number
  assertAvailable(): Promise<void>
  resolve(scope: string, fingerprint: string, entryPath: string): Promise<string | null>
  install(
    scope: string,
    fingerprint: string,
    entryPath: string,
    archive: ArrayBuffer,
  ): Promise<string>
  remove(scope: string): Promise<void>
}

export function buildScormPackageScope(
  campusId: string,
  userId: number,
  context: CourseNavigationContext,
  learningPathId: number,
): string {
  return [campusId, userId, context.courseId, context.sessionId ?? 0, learningPathId].join(":")
}

export function appendScormLaunchParameters(entryUrl: string, parameters: string): string {
  const trimmed = parameters.trim().replace(/^[?&]+/, "")
  if (!trimmed) {
    return entryUrl
  }

  const url = new URL(entryUrl)
  for (const [key, value] of new URLSearchParams(trimmed)) {
    url.searchParams.append(key, value)
  }

  return url.toString()
}
