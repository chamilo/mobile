import { fileURLToPath, URL } from "node:url"

import vue from "@vitejs/plugin-vue"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "")
  const proxyTarget = environment.VITE_DEV_PROXY_TARGET

  return {
    plugins: [vue()],
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
              secure: environment.VITE_DEV_PROXY_INSECURE !== "true",
              rewrite: (path) => path.replace(/^\/__campus-api/, ""),
            },
          },
        }
      : undefined,
  }
})
