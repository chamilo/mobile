import { Capacitor } from "@capacitor/core"

import { nativeScormPackageHost } from "@/services/learningPaths/NativeScormPackageHost"
import {
  appendScormLaunchParameters,
  MAX_SCORM_PACKAGE_SIZE_BYTES,
  type ScormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHostTypes"
import { webScormFixtureHost } from "@/services/learningPaths/WebScormFixtureHost"

export { appendScormLaunchParameters, MAX_SCORM_PACKAGE_SIZE_BYTES, ScormPackageHostError }

export const scormPackageHost: ScormPackageHost =
  Capacitor.getPlatform() === "android" ? nativeScormPackageHost : webScormFixtureHost
