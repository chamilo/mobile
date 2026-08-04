import { Capacitor, registerPlugin } from "@capacitor/core"

import {
  MAX_SCORM_PACKAGE_SIZE_BYTES,
  type ScormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHostTypes"

interface ResolveOptions {
  scope: string
  fingerprint: string
  entryPath: string
}

interface InstallOptions extends ResolveOptions {
  archiveBase64: string
}

interface ScormPackageStatusResult {
  available: boolean
}

interface ScormPackageResult {
  found: boolean
  entryUri?: string
}

interface ChamiloScormPackagePlugin {
  status(): Promise<ScormPackageStatusResult>
  resolve(options: ResolveOptions): Promise<ScormPackageResult>
  install(options: InstallOptions): Promise<ScormPackageResult>
  removeScope(options: { scope: string }): Promise<void>
  removeCampus(options: { campusId: string }): Promise<void>
}

const nativePlugin = registerPlugin<ChamiloScormPackagePlugin>("ChamiloScormPackage")

function encodeBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () =>
      reject(reader.error ?? new Error("The SCORM package could not be encoded."))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The SCORM package could not be encoded."))
        return
      }

      const marker = ";base64,"
      const markerIndex = reader.result.indexOf(marker)
      resolve(markerIndex >= 0 ? reader.result.slice(markerIndex + marker.length) : reader.result)
    }

    reader.readAsDataURL(new Blob([buffer], { type: "application/zip" }))
  })
}

export class NativeScormPackageHost implements ScormPackageHost {
  isAndroid(): boolean {
    return Capacitor.getPlatform() === "android"
  }

  async assertAvailable(): Promise<void> {
    if (!this.isAndroid()) {
      throw new ScormPackageHostError(
        "unsupported_platform",
        "SCORM playback is unavailable on this platform.",
      )
    }

    try {
      const result = await nativePlugin.status()
      if (!result.available) {
        throw new Error("The native SCORM package host reported that it is unavailable.")
      }
    } catch (error) {
      throw new ScormPackageHostError(
        "plugin_unavailable",
        "The Android SCORM package host is not registered in this APK.",
        error,
      )
    }
  }

  async resolve(scope: string, fingerprint: string, entryPath: string): Promise<string | null> {
    await this.assertAvailable()

    try {
      const result = await nativePlugin.resolve({ scope, fingerprint, entryPath })
      if (!result.found || !result.entryUri) {
        return null
      }

      return Capacitor.convertFileSrc(result.entryUri)
    } catch (error) {
      throw new ScormPackageHostError(
        "install_failed",
        "The cached SCORM package could not be resolved on this device.",
        error,
      )
    }
  }

  async install(
    scope: string,
    fingerprint: string,
    entryPath: string,
    archive: ArrayBuffer,
  ): Promise<string> {
    await this.assertAvailable()

    if (archive.byteLength <= 0 || archive.byteLength > MAX_SCORM_PACKAGE_SIZE_BYTES) {
      throw new ScormPackageHostError(
        "too_large",
        "The SCORM package exceeds the mobile runtime size limit.",
      )
    }

    try {
      const result = await nativePlugin.install({
        scope,
        fingerprint,
        entryPath,
        archiveBase64: await encodeBase64(archive),
      })
      if (!result.found || !result.entryUri) {
        throw new Error("The native SCORM package host returned no launch file.")
      }

      return Capacitor.convertFileSrc(result.entryUri)
    } catch (error) {
      throw new ScormPackageHostError(
        "install_failed",
        "The SCORM ZIP could not be extracted or its launch file was not found.",
        error,
      )
    }
  }

  async remove(scope: string): Promise<void> {
    await this.assertAvailable()

    try {
      await nativePlugin.removeScope({ scope })
    } catch (error) {
      throw new ScormPackageHostError(
        "install_failed",
        "The cached SCORM package could not be removed from this device.",
        error,
      )
    }
  }
}

export const nativeScormPackageHost = new NativeScormPackageHost()

export async function clearNativeScormCampusPackages(campusId: string): Promise<void> {
  if (Capacitor.getPlatform() !== "android") {
    return
  }

  try {
    await nativePlugin.removeCampus({ campusId })
  } catch (error) {
    throw new ScormPackageHostError(
      "install_failed",
      "The offline SCORM packages for this campus could not be removed.",
      error,
    )
  }
}
