/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_DEV_PROXY?: string
  readonly VITE_DEV_PROXY_TARGET?: string
  readonly VITE_DEV_PROXY_INSECURE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
