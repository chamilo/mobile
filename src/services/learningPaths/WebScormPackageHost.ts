import { Capacitor } from "@capacitor/core"
import { unzip } from "fflate"

import {
  MAX_WEB_SCORM_PACKAGE_SIZE_BYTES,
  type ScormPackageHost,
  ScormPackageHostError,
} from "@/services/learningPaths/ScormPackageHostTypes"

const WEB_SCORM_RESOURCE_PREFIX = "/__scorm-web-packages/"
const WEB_SCORM_CACHE_PREFIX = "chamilo-scorm-web-v1"
const WEB_SCORM_SERVICE_WORKER_URL = "/scorm-package-service-worker.js"
const WEB_SCORM_METADATA_NAME = ".chamilo-scorm-runtime.json"
const MAX_SCORM_ARCHIVE_ENTRIES = 20_000
const MAX_SCORM_UNCOMPRESSED_SIZE_BYTES = 512 * 1024 * 1024
const SERVICE_WORKER_READY_TIMEOUT_MS = 8_000
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

const CONTENT_TYPES: Record<string, string> = {
  "3gp": "video/3gpp",
  aac: "audio/aac",
  avi: "video/x-msvideo",
  bmp: "image/bmp",
  css: "text/css; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  eot: "application/vnd.ms-fontobject",
  gif: "image/gif",
  htm: "text/html; charset=utf-8",
  html: "text/html; charset=utf-8",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  m4a: "audio/mp4",
  m4v: "video/mp4",
  mjs: "text/javascript; charset=utf-8",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  ogv: "video/ogg",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  srt: "application/x-subrip; charset=utf-8",
  svg: "image/svg+xml",
  swf: "application/x-shockwave-flash",
  txt: "text/plain; charset=utf-8",
  ttf: "font/ttf",
  vtt: "text/vtt; charset=utf-8",
  wasm: "application/wasm",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xht: "application/xhtml+xml; charset=utf-8",
  xhtml: "application/xhtml+xml; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  zip: "application/zip",
}

export interface ExtractedScormArchive {
  files: Map<string, Uint8Array>
  launchPath: string
  uncompressedSize: number
}

let serviceWorkerReadyPromise: Promise<void> | null = null

function normalizeFingerprint(value: string): string {
  const fingerprint = value.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new ScormPackageHostError(
      "metadata_missing",
      "The SCORM package fingerprint is invalid.",
    )
  }

  return fingerprint
}

export function normalizeWebScormArchivePath(value: string, allowEmpty = false): string {
  const path = value.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  if (path.includes("\0") || /^[A-Za-z]:/.test(path)) {
    throw new ScormPackageHostError("install_failed", "The SCORM package path is invalid.")
  }

  const segments: string[] = []
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") {
      continue
    }
    if (segment === "..") {
      throw new ScormPackageHostError("install_failed", "The SCORM package path is unsafe.")
    }
    segments.push(segment)
  }

  const normalized = segments.join("/")
  if (!allowEmpty && !normalized) {
    throw new ScormPackageHostError("install_failed", "The SCORM package path is empty.")
  }

  return normalized
}

function isSuffixMatch(requestedPath: string, candidatePath: string): boolean {
  return (
    requestedPath === candidatePath ||
    requestedPath.endsWith(`/${candidatePath}`) ||
    candidatePath.endsWith(`/${requestedPath}`)
  )
}

export function resolveWebScormLaunchPath(
  paths: Iterable<string>,
  requestedPath: string,
): string {
  const requested = normalizeWebScormArchivePath(requestedPath)
  const candidates = [...paths]

  if (candidates.includes(requested)) {
    return requested
  }

  const matches = candidates.filter((candidate) => isSuffixMatch(requested, candidate))
  if (matches.length === 1) {
    return matches[0] ?? requested
  }
  if (matches.length > 1) {
    throw new ScormPackageHostError(
      "install_failed",
      "The SCORM launch path is ambiguous in the package.",
    )
  }

  throw new ScormPackageHostError(
    "install_failed",
    "The SCORM launch file is missing from the package.",
  )
}

export function extractWebScormArchive(
  archive: ArrayBuffer,
  requestedEntryPath: string,
): Promise<ExtractedScormArchive> {
  return new Promise((resolve, reject) => {
    const seenPaths = new Set<string>()
    let entryCount = 0
    let declaredUncompressedSize = 0

    const rejectInstall = (message: string, originalError?: unknown): void => {
      reject(new ScormPackageHostError("install_failed", message, originalError))
    }

    try {
      unzip(
        new Uint8Array(archive),
        {
          filter(file) {
            entryCount += 1
            if (entryCount > MAX_SCORM_ARCHIVE_ENTRIES) {
              throw new ScormPackageHostError(
                "install_failed",
                "The SCORM package contains too many files.",
              )
            }

            const normalized = normalizeWebScormArchivePath(file.name, true)
            const directory = /\/$/.test(file.name.replace(/\\/g, "/"))
            if (directory || !normalized) {
              return false
            }

            if (seenPaths.has(normalized)) {
              throw new ScormPackageHostError(
                "install_failed",
                "The SCORM package contains duplicate file paths.",
              )
            }
            seenPaths.add(normalized)

            const originalSize = Math.max(0, Number(file.originalSize) || 0)
            declaredUncompressedSize += originalSize
            if (declaredUncompressedSize > MAX_SCORM_UNCOMPRESSED_SIZE_BYTES) {
              throw new ScormPackageHostError(
                "too_large",
                "The SCORM package is too large after extraction for web development playback.",
              )
            }

            return true
          },
        },
        (error, extracted) => {
          if (error) {
            rejectInstall("The SCORM ZIP could not be extracted in the browser.", error)
            return
          }

          try {
            const files = new Map<string, Uint8Array>()
            let actualUncompressedSize = 0

            for (const [rawPath, content] of Object.entries(extracted)) {
              const normalized = normalizeWebScormArchivePath(rawPath, true)
              if (!normalized) {
                continue
              }
              if (files.has(normalized)) {
                throw new ScormPackageHostError(
                  "install_failed",
                  "The SCORM package contains duplicate normalized file paths.",
                )
              }

              actualUncompressedSize += content.byteLength
              if (actualUncompressedSize > MAX_SCORM_UNCOMPRESSED_SIZE_BYTES) {
                throw new ScormPackageHostError(
                  "too_large",
                  "The SCORM package is too large after extraction for web development playback.",
                )
              }

              files.set(normalized, content)
            }

            if (files.size === 0) {
              throw new ScormPackageHostError("install_failed", "The SCORM package is empty.")
            }

            resolve({
              files,
              launchPath: resolveWebScormLaunchPath(files.keys(), requestedEntryPath),
              uncompressedSize: actualUncompressedSize,
            })
          } catch (callbackError) {
            reject(callbackError)
          }
        },
      )
    } catch (error) {
      reject(error)
    }
  })
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new ScormPackageHostError(
      "install_failed",
      "The browser cannot build a secure SCORM package cache key.",
    )
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function campusIdFromScope(scope: string): string {
  const campusId = scope.split(":", 1)[0]?.trim() ?? ""
  if (!campusId) {
    throw new ScormPackageHostError(
      "metadata_missing",
      "The SCORM package scope has no campus identifier.",
    )
  }

  return campusId
}

async function cacheIdentity(scope: string, fingerprint: string): Promise<{
  cacheName: string
  scopePrefix: string
  resourceBasePath: string
}> {
  const campusHash = await sha256Hex(campusIdFromScope(scope))
  const scopeHash = await sha256Hex(scope)
  const normalizedFingerprint = normalizeFingerprint(fingerprint)

  return {
    cacheName: `${WEB_SCORM_CACHE_PREFIX}:${campusHash}:${scopeHash}:${normalizedFingerprint}`,
    scopePrefix: `${WEB_SCORM_CACHE_PREFIX}:${campusHash}:${scopeHash}:`,
    resourceBasePath: `${WEB_SCORM_RESOURCE_PREFIX}${campusHash}/${scopeHash}/${normalizedFingerprint}/`,
  }
}

function encodeArchivePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

function virtualResourceUrl(resourceBasePath: string, path: string): string {
  return new URL(
    `${resourceBasePath}${encodeArchivePath(path)}`,
    window.location.origin,
  ).toString()
}

function metadataUrl(resourceBasePath: string): string {
  return new URL(`${resourceBasePath}${WEB_SCORM_METADATA_NAME}`, window.location.origin).toString()
}

function contentType(path: string): string {
  const fileName = path.split("/").pop() ?? ""
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : ""

  return CONTENT_TYPES[extension] ?? "application/octet-stream"
}

function copyToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)

  return copy.buffer
}

function waitForServiceWorkerController(): Promise<void> {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
      reject(
        new ScormPackageHostError(
          "install_failed",
          "The local SCORM service worker did not take control of the development page.",
        ),
      )
    }, SERVICE_WORKER_READY_TIMEOUT_MS)

    function handleControllerChange(): void {
      if (settled || !navigator.serviceWorker.controller) return
      settled = true
      window.clearTimeout(timeout)
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
      resolve()
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
  })
}

async function ensureServiceWorkerReady(): Promise<void> {
  if (serviceWorkerReadyPromise) {
    return serviceWorkerReadyPromise
  }

  serviceWorkerReadyPromise = (async () => {
    try {
      const registration = await navigator.serviceWorker.register(WEB_SCORM_SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
      })
      const readyRegistration = await navigator.serviceWorker.ready
      const activeWorker = readyRegistration.active ?? registration.active
      activeWorker?.postMessage({ type: "chamilo-scorm-claim-clients" })
      await waitForServiceWorkerController()
    } catch (error) {
      serviceWorkerReadyPromise = null
      if (error instanceof ScormPackageHostError) {
        throw error
      }
      throw new ScormPackageHostError(
        "install_failed",
        "The local SCORM service worker could not be registered.",
        error,
      )
    }
  })()

  return serviceWorkerReadyPromise
}

async function assertVirtualResource(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "HEAD",
    cache: "no-store",
    credentials: "same-origin",
  })

  if (!response.ok || response.headers.get("x-chamilo-scorm-cache") !== "1") {
    throw new ScormPackageHostError(
      "install_failed",
      `The local SCORM virtual resource returned HTTP ${response.status}.`,
    )
  }
}

async function clearStaleScopeCaches(scopePrefix: string, activeCacheName: string): Promise<void> {
  const names = await caches.keys()
  await Promise.all(
    names
      .filter((name) => name.startsWith(scopePrefix) && name !== activeCacheName)
      .map((name) => caches.delete(name)),
  )
}

export class WebScormPackageHost implements ScormPackageHost {
  readonly maxPackageSizeBytes = MAX_WEB_SCORM_PACKAGE_SIZE_BYTES

  async assertAvailable(): Promise<void> {
    if (
      Capacitor.isNativePlatform() ||
      Capacitor.isPluginAvailable("ChamiloScormPackage") ||
      !import.meta.env.DEV ||
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !LOCAL_HOSTNAMES.has(window.location.hostname)
    ) {
      throw new ScormPackageHostError(
        "unsupported_platform",
        "Real web SCORM playback is restricted to local Vite development.",
      )
    }

    if (!("serviceWorker" in navigator) || !("caches" in globalThis)) {
      throw new ScormPackageHostError(
        "install_failed",
        "This browser does not provide the service worker and Cache Storage APIs required for local SCORM playback.",
      )
    }

    await ensureServiceWorkerReady()
  }

  async resolve(scope: string, fingerprint: string, entryPath: string): Promise<string | null> {
    await this.assertAvailable()

    const identity = await cacheIdentity(scope, fingerprint)
    const cache = await caches.open(identity.cacheName)
    const normalizedEntryPath = normalizeWebScormArchivePath(entryPath)
    let launchPath = normalizedEntryPath

    const metadata = await cache.match(metadataUrl(identity.resourceBasePath))
    if (metadata) {
      try {
        const value = (await metadata.json()) as { requestedEntryPath?: unknown; launchPath?: unknown }
        if (
          value.requestedEntryPath === normalizedEntryPath &&
          typeof value.launchPath === "string"
        ) {
          launchPath = normalizeWebScormArchivePath(value.launchPath)
        }
      } catch {
        return null
      }
    }

    const requestUrl = virtualResourceUrl(identity.resourceBasePath, launchPath)
    const response = await cache.match(requestUrl, { ignoreSearch: true })

    if (!response) {
      return null
    }

    await assertVirtualResource(requestUrl)
    return requestUrl
  }

  async install(
    scope: string,
    fingerprint: string,
    entryPath: string,
    archive: ArrayBuffer,
  ): Promise<string> {
    await this.assertAvailable()

    if (archive.byteLength <= 0 || archive.byteLength > this.maxPackageSizeBytes) {
      throw new ScormPackageHostError(
        "too_large",
        "The SCORM package exceeds the local web debug runtime size limit.",
      )
    }

    const identity = await cacheIdentity(scope, fingerprint)
    const extracted = await extractWebScormArchive(archive, entryPath)
    const cache = await caches.open(identity.cacheName)

    try {
      for (const [path, data] of extracted.files.entries()) {
        const url = virtualResourceUrl(identity.resourceBasePath, path)
        const headers = new Headers({
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=31536000, immutable",
          "Content-Length": String(data.byteLength),
          "Content-Type": contentType(path),
          "X-Chamilo-Scorm-Cache": "1",
        })

        await cache.put(url, new Response(copyToArrayBuffer(data), { status: 200, headers }))
      }

      const requestedEntryPath = normalizeWebScormArchivePath(entryPath)
      await cache.put(
        metadataUrl(identity.resourceBasePath),
        new Response(
          JSON.stringify({ requestedEntryPath, launchPath: extracted.launchPath }),
          {
            status: 200,
            headers: {
              "Cache-Control": "private, max-age=31536000, immutable",
              "Content-Type": "application/json; charset=utf-8",
            },
          },
        ),
      )

      await clearStaleScopeCaches(identity.scopePrefix, identity.cacheName)

      const launchUrl = virtualResourceUrl(identity.resourceBasePath, extracted.launchPath)
      await assertVirtualResource(launchUrl)

      console.info(
        `[Chamilo SCORM web] Mounted ${extracted.files.size} files (${extracted.uncompressedSize} bytes) for local playback.`,
      )

      return launchUrl
    } catch (error) {
      await caches.delete(identity.cacheName).catch(() => false)
      if (error instanceof ScormPackageHostError) {
        throw error
      }
      throw new ScormPackageHostError(
        "install_failed",
        "The extracted SCORM package could not be stored for local web playback.",
        error,
      )
    }
  }

  async remove(scope: string): Promise<void> {
    await this.assertAvailable()

    const identity = await cacheIdentity(scope, "0".repeat(64))
    const names = await caches.keys()
    await Promise.all(
      names.filter((name) => name.startsWith(identity.scopePrefix)).map((name) => caches.delete(name)),
    )
  }
}

export const webScormPackageHost = new WebScormPackageHost()

export async function clearWebScormCampusPackages(campusId: string): Promise<void> {
  if (
    Capacitor.isNativePlatform() ||
    !import.meta.env.DEV ||
    typeof window === "undefined" ||
    !("caches" in globalThis)
  ) {
    return
  }

  const campusHash = await sha256Hex(campusId)
  const cachePrefix = `${WEB_SCORM_CACHE_PREFIX}:${campusHash}:`
  const names = await caches.keys()
  await Promise.all(
    names.filter((name) => name.startsWith(cachePrefix)).map((name) => caches.delete(name)),
  )
}
