import { Capacitor } from "@capacitor/core"

import {
  clearNativeScormCampusPackages,
  nativeScormPackageHost,
} from "@/services/learningPaths/NativeScormPackageHost"
import {
  appendScormLaunchParameters,
  buildScormPackageScope,
  MAX_NATIVE_SCORM_PACKAGE_SIZE_BYTES,
  MAX_WEB_SCORM_PACKAGE_SIZE_BYTES,
  type ScormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHostTypes"
import {
  clearWebScormCampusPackages,
  webScormPackageHost,
} from "@/services/learningPaths/WebScormPackageHost"

export {
  appendScormLaunchParameters,
  buildScormPackageScope,
  MAX_NATIVE_SCORM_PACKAGE_SIZE_BYTES,
  MAX_WEB_SCORM_PACKAGE_SIZE_BYTES,
  ScormPackageHostError,
}

const NATIVE_SCORM_PLUGIN = "ChamiloScormPackage"

export function resolveScormPackageHost(): ScormPackageHost {
  if (
    Capacitor.getPlatform() === "android" ||
    Capacitor.isPluginAvailable(NATIVE_SCORM_PLUGIN)
  ) {
    return nativeScormPackageHost
  }

  return webScormPackageHost
}

export const scormPackageHost: ScormPackageHost = {
  get maxPackageSizeBytes() {
    return resolveScormPackageHost().maxPackageSizeBytes
  },

  assertAvailable() {
    return resolveScormPackageHost().assertAvailable()
  },

  resolve(scope, fingerprint, entryPath) {
    return resolveScormPackageHost().resolve(scope, fingerprint, entryPath)
  },

  install(scope, fingerprint, entryPath, archive) {
    return resolveScormPackageHost().install(scope, fingerprint, entryPath, archive)
  },

  remove(scope) {
    return resolveScormPackageHost().remove(scope)
  },
}

export async function clearScormCampusPackages(campusId: string): Promise<void> {
  if (
    Capacitor.getPlatform() === "android" ||
    Capacitor.isPluginAvailable(NATIVE_SCORM_PLUGIN)
  ) {
    await clearNativeScormCampusPackages(campusId)
    return
  }

  await clearWebScormCampusPackages(campusId)
}
