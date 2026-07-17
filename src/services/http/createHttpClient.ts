import { Capacitor } from "@capacitor/core"

import { normalizeCampusUrl } from "@/domain/campus/normalizeCampusUrl"
import type { CampusProfile } from "@/domain/campus/types"
import { BrowserHttpClient } from "@/services/http/BrowserHttpClient"
import type { HttpClient } from "@/services/http/HttpClient"
import { NativeHttpClient } from "@/services/http/NativeHttpClient"

function getBrowserBaseUrl(campus: CampusProfile): string {
  const normalizedCampusUrl = normalizeCampusUrl(campus.baseUrl, {
    allowInsecureHttp: import.meta.env.DEV && campus.allowInsecureHttp,
  })
  const useDevelopmentProxy =
    import.meta.env.DEV && import.meta.env.VITE_USE_DEV_PROXY?.toLowerCase() === "true"
  const proxyTarget = import.meta.env.VITE_DEV_PROXY_TARGET

  if (!useDevelopmentProxy || !proxyTarget) {
    return normalizedCampusUrl
  }

  try {
    const normalizedProxyTarget = normalizeCampusUrl(proxyTarget, {
      allowInsecureHttp: true,
    })

    if (normalizedProxyTarget !== normalizedCampusUrl) {
      return normalizedCampusUrl
    }
  } catch {
    return normalizedCampusUrl
  }

  return `${window.location.origin}/__campus-api`
}

export function createHttpClient(campus: CampusProfile): HttpClient {
  if (Capacitor.isNativePlatform()) {
    return new NativeHttpClient()
  }

  return new BrowserHttpClient(getBrowserBaseUrl(campus))
}
