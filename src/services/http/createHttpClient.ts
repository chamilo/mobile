import { Capacitor } from "@capacitor/core"

import { normalizeCampusUrl } from "@/domain/campus/normalizeCampusUrl"
import type { CampusProfile } from "@/domain/campus/types"
import { BrowserHttpClient } from "@/services/http/BrowserHttpClient"
import type { HttpClient } from "@/services/http/HttpClient"
import { NativeHttpClient } from "@/services/http/NativeHttpClient"
import { ObservedCampusHttpClient } from "@/services/http/ObservedCampusHttpClient"

function getNormalizedCampusUrl(campus: CampusProfile): string {
  return normalizeCampusUrl(campus.baseUrl, {
    allowInsecureHttp: campus.allowInsecureHttp,
  })
}

function getBrowserBaseUrl(campus: CampusProfile): string {
  const normalizedCampusUrl = getNormalizedCampusUrl(campus)
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
  const client = Capacitor.isNativePlatform()
    ? new NativeHttpClient(getNormalizedCampusUrl(campus))
    : new BrowserHttpClient(getBrowserBaseUrl(campus))

  return new ObservedCampusHttpClient(campus.id, client)
}
