/* global self, caches, Response, Headers, URL, fetch */

const SCORM_RESOURCE_PREFIX = "/__scorm-web-packages/"
const SCORM_PACKAGE_PATH_PATTERN =
  /^\/__scorm-web-packages\/[^/]+\/[^/]+\/[a-f0-9]{64}\//i
const CSTUDIO_EMBEDDED_RESOURCE_PATTERNS = [
  /^\/resources\/(?:exercise|assignment|forum|survey)\//i,
  /^\/main\/link\/link_goto\.php$/i,
]

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "chamilo-scorm-claim-clients") {
    event.waitUntil(self.clients.claim())
  }
})

function parseRange(header, size) {
  if (!header || !header.startsWith("bytes=")) return null

  const spec = header.slice(6).split(",", 1)[0]?.trim() ?? ""
  const [rawStart, rawEnd] = spec.split("-", 2)
  if (rawStart === "" && rawEnd === "") return null

  if (rawStart === "") {
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null

    return { start: Math.max(0, size - Math.floor(suffix)), end: Math.max(0, size - 1) }
  }

  const start = Number(rawStart)
  if (!Number.isFinite(start) || start < 0 || start >= size) return null

  const end = rawEnd === "" ? size - 1 : Number(rawEnd)
  if (!Number.isFinite(end) || end < start) return null

  return { start, end: Math.min(end, size - 1) }
}

function scormPackageBase(value) {
  if (!value) return null

  try {
    const url = new URL(value, self.location.origin)
    if (url.origin !== self.location.origin) return null

    return url.pathname.match(SCORM_PACKAGE_PATH_PATTERN)?.[0] ?? null
  } catch {
    return null
  }
}

function escapedPackageCacheUrl(requestUrl, referrer) {
  const url = new URL(requestUrl)
  if (url.origin !== self.location.origin || url.pathname.startsWith(SCORM_RESOURCE_PREFIX)) {
    return null
  }

  const packageBase = scormPackageBase(referrer)
  if (!packageBase || !url.pathname.startsWith("/")) return null

  const relativePath = url.pathname.replace(/^\/+/, "")
  return new URL(`${packageBase}${relativePath}${url.search}`, self.location.origin).toString()
}

function isCStudioEmbeddedResource(pathname) {
  return CSTUDIO_EMBEDDED_RESOURCE_PATTERNS.some((pattern) => pattern.test(pathname))
}

function notFoundResponse() {
  return new Response("SCORM package resource not found.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Chamilo-Scorm-Cache": "0",
    },
  })
}

function cstudioPlaceholderResponse(method) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8",
    "X-Chamilo-CStudio-Bridge": "pending",
  }

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers })
  }

  return new Response(
    "<!doctype html><html><body style=\"margin:0;background:#fff\"></body></html>",
    { status: 200, headers },
  )
}

async function cachedResponse(request, cacheUrl) {
  const cached = await caches.match(cacheUrl, { ignoreSearch: true })
  if (!cached) return notFoundResponse()

  if (request.method === "HEAD") {
    return new Response(null, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    })
  }

  const rangeHeader = request.headers.get("Range")
  if (!rangeHeader) return cached

  const body = await cached.arrayBuffer()
  const range = parseRange(rangeHeader, body.byteLength)
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${body.byteLength}`,
        "Accept-Ranges": "bytes",
        "X-Chamilo-Scorm-Cache": "1",
      },
    })
  }

  const chunk = body.slice(range.start, range.end + 1)
  const headers = new Headers(cached.headers)
  headers.set("Accept-Ranges", "bytes")
  headers.set("Content-Length", String(chunk.byteLength))
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${body.byteLength}`)
  headers.set("X-Chamilo-Scorm-Cache", "1")

  return new Response(chunk, { status: 206, headers })
}

async function escapedRootResponse(request, cacheUrl, pathname) {
  const cached = await caches.match(cacheUrl, { ignoreSearch: true })
  if (cached) {
    return cachedResponse(request, cacheUrl)
  }

  if (isCStudioEmbeddedResource(pathname)) {
    return cstudioPlaceholderResponse(request.method)
  }

  return notFoundResponse()
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  const directPackageRequest = url.pathname.startsWith(SCORM_RESOURCE_PREFIX)
  const escapedCacheUrl = escapedPackageCacheUrl(event.request.url, event.request.referrer)
  if (!directPackageRequest && !escapedCacheUrl) return

  if (event.request.method !== "GET" && event.request.method !== "HEAD") {
    event.respondWith(
      Promise.resolve(
        new Response("Method not allowed.", {
          status: 405,
          headers: {
            Allow: "GET, HEAD",
            "Cache-Control": "no-store",
          },
        }),
      ),
    )
    return
  }

  if (directPackageRequest) {
    event.respondWith(cachedResponse(event.request, event.request.url))
    return
  }

  event.respondWith(escapedRootResponse(event.request, escapedCacheUrl, url.pathname))
})
