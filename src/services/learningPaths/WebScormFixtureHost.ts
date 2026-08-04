import {
  MAX_SCORM_PACKAGE_SIZE_BYTES,
  type ScormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHostTypes"

interface ScormWebFixture {
  id: "scorm12" | "scorm2004"
  archiveSha256: string
  basePath: string
  entryPaths: readonly string[]
}

export interface ResolvedScormWebFixture {
  fixtureId: ScormWebFixture["id"]
  archiveSha256: string
  entryPath: string
  url: string
}

export const SCORM_WEB_FIXTURES: readonly ScormWebFixture[] = [
  {
    id: "scorm12",
    archiveSha256: "554cefe15f8a453c390cb3fdd9bd234dce74f65ba4b7b75569d5d36ce9d74da6",
    basePath: "/__scorm-fixtures/scorm12",
    entryPaths: ["sco1.html", "sco2.html"],
  },
  {
    id: "scorm2004",
    archiveSha256: "43c9018f240141848439d9463fa1011e97b9f6625f55b5f84814c43e07277d5f",
    basePath: "/__scorm-fixtures/scorm2004",
    entryPaths: ["sco/intro.html", "sco/assessment.html"],
  },
]

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])
const validatedFixtureByFingerprint = new Map<string, ScormWebFixture>()

function normalizeArchivePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized || normalized.includes("\0") || /^[A-Za-z]:/.test(normalized)) {
    return ""
  }

  const segments: string[] = []
  for (const segment of normalized.split("/")) {
    if (!segment || segment === ".") {
      continue
    }
    if (segment === "..") {
      return ""
    }
    segments.push(segment)
  }

  return segments.join("/")
}

function matchEntryPath(fixture: ScormWebFixture, requestedEntryPath: string): string | null {
  const normalized = normalizeArchivePath(requestedEntryPath)
  if (!normalized) {
    return null
  }

  return (
    fixture.entryPaths.find(
      (entryPath) => normalized === entryPath || normalized.endsWith(`/${entryPath}`),
    ) ?? null
  )
}

function buildFixturePath(basePath: string, entryPath: string): string {
  const encodedPath = entryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${basePath}/${encodedPath}`
}

export function resolveScormWebFixture(
  archiveSha256: string,
  requestedEntryPath: string,
): ResolvedScormWebFixture | null {
  const normalizedHash = archiveSha256.trim().toLowerCase()
  const fixture = SCORM_WEB_FIXTURES.find(({ archiveSha256: hash }) => hash === normalizedHash)
  if (!fixture) {
    return null
  }

  const entryPath = matchEntryPath(fixture, requestedEntryPath)
  if (!entryPath) {
    return null
  }

  return {
    fixtureId: fixture.id,
    archiveSha256: fixture.archiveSha256,
    entryPath,
    url: buildFixturePath(fixture.basePath, entryPath),
  }
}

async function sha256Hex(archive: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new ScormPackageHostError(
      "install_failed",
      "The browser cannot calculate the SCORM package fingerprint.",
    )
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", archive)

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function assertFixtureFileAvailable(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "HEAD",
    cache: "no-store",
    credentials: "same-origin",
  })

  if (!response.ok) {
    throw new ScormPackageHostError(
      "install_failed",
      `The local SCORM fixture entry returned HTTP ${response.status}.`,
    )
  }
}

export class WebScormFixtureHost implements ScormPackageHost {
  async assertAvailable(): Promise<void> {
    if (
      !import.meta.env.DEV ||
      typeof window === "undefined" ||
      !LOCAL_HOSTNAMES.has(window.location.hostname)
    ) {
      throw new ScormPackageHostError(
        "unsupported_platform",
        "Web SCORM playback is restricted to local Vite development.",
      )
    }
  }

  async resolve(_scope: string, fingerprint: string, entryPath: string): Promise<string | null> {
    await this.assertAvailable()

    const fixture = validatedFixtureByFingerprint.get(fingerprint)
    if (!fixture) {
      return null
    }

    const matchedEntryPath = matchEntryPath(fixture, entryPath)
    if (!matchedEntryPath) {
      return null
    }

    return new URL(
      buildFixturePath(fixture.basePath, matchedEntryPath),
      window.location.origin,
    ).toString()
  }

  async install(
    _scope: string,
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

    const archiveSha256 = await sha256Hex(archive)
    const resolved = resolveScormWebFixture(archiveSha256, entryPath)
    if (!resolved) {
      throw new ScormPackageHostError(
        "fixture_mismatch",
        "The downloaded package does not match the local SCORM test fixtures.",
      )
    }

    await assertFixtureFileAvailable(resolved.url)

    const fixture = SCORM_WEB_FIXTURES.find(({ id }) => id === resolved.fixtureId)
    if (!fixture) {
      throw new ScormPackageHostError(
        "install_failed",
        "The validated local SCORM fixture could not be resolved.",
      )
    }

    validatedFixtureByFingerprint.set(fingerprint, fixture)

    return new URL(resolved.url, window.location.origin).toString()
  }

  async remove(scope: string): Promise<void> {
    void scope
    // Local Vite fixtures are application assets, not downloaded course data.
  }
}

export const webScormFixtureHost = new WebScormFixtureHost()
