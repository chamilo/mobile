import { readFile, stat } from "node:fs/promises"
import { extname, resolve, sep } from "node:path"
import { fileURLToPath, URL } from "node:url"

import vue from "@vitejs/plugin-vue"
import { defineConfig, loadEnv, type Plugin } from "vite"

const SCORM_FIXTURE_PREFIX = "/__scorm-fixtures/"

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
}

function scormFixturePlugin(fixtureRoot: string): Plugin {
  return {
    name: "chamilo-scorm-local-fixtures",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ?? "/"
        const pathname = new URL(requestUrl, "http://localhost").pathname

        if (!pathname.startsWith(SCORM_FIXTURE_PREFIX)) {
          next()
          return
        }

        if (request.method !== "GET" && request.method !== "HEAD") {
          response.statusCode = 405
          response.setHeader("Allow", "GET, HEAD")
          response.end()
          return
        }

        let relativePath: string
        try {
          relativePath = decodeURIComponent(pathname.slice(SCORM_FIXTURE_PREFIX.length))
        } catch {
          response.statusCode = 400
          response.end("Invalid fixture path.")
          return
        }

        if (!relativePath || relativePath.includes("\0")) {
          response.statusCode = 404
          response.end()
          return
        }

        const fixturePath = resolve(fixtureRoot, relativePath)
        const fixtureRootPrefix = `${fixtureRoot}${sep}`
        if (!fixturePath.startsWith(fixtureRootPrefix)) {
          response.statusCode = 403
          response.end()
          return
        }

        try {
          const fixtureStat = await stat(fixturePath)
          if (!fixtureStat.isFile()) {
            response.statusCode = 404
            response.end()
            return
          }

          response.statusCode = 200
          response.setHeader(
            "Content-Type",
            CONTENT_TYPES[extname(fixturePath).toLowerCase()] ?? "application/octet-stream",
          )
          response.setHeader("Content-Length", fixtureStat.size)
          response.setHeader("Cache-Control", "no-store")
          response.setHeader("X-Content-Type-Options", "nosniff")

          if (request.method === "HEAD") {
            response.end()
            return
          }

          response.end(await readFile(fixturePath))
        } catch {
          response.statusCode = 404
          response.end()
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "")
  const proxyTarget = process.env.VITE_DEV_PROXY_TARGET || environment.VITE_DEV_PROXY_TARGET
  const proxyInsecure =
    (process.env.VITE_DEV_PROXY_INSECURE || environment.VITE_DEV_PROXY_INSECURE) === "true"
  const fixtureRootValue =
    process.env.VITE_SCORM_FIXTURE_ROOT || environment.VITE_SCORM_FIXTURE_ROOT
  const fixtureRoot = fixtureRootValue ? resolve(fixtureRootValue) : ""

  return {
    plugins: [vue(), ...(fixtureRoot ? [scormFixturePlugin(fixtureRoot)] : [])],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: proxyTarget
      ? {
          proxy: {
            "/__campus-api": {
              target: proxyTarget,
              changeOrigin: true,
              secure: !proxyInsecure,
              rewrite: (path: string) => path.replace(/^\/__campus-api/, ""),
            },
          },
        }
      : undefined,
  }
})
