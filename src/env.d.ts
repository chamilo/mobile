/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  readonly VITE_USE_DEV_PROXY?: string
  readonly VITE_DEV_PROXY_TARGET?: string
  readonly VITE_DEV_PROXY_INSECURE?: string
  readonly VITE_PUSH_NOTIFICATIONS_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
