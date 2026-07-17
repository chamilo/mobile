export class UnsafeExternalUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UnsafeExternalUrlError"
  }
}

export function normalizeSafeExternalUrl(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new UnsafeExternalUrlError("The external URL is empty.")
  }

  let url: URL

  try {
    url = new URL(trimmed)
  } catch (error) {
    throw new UnsafeExternalUrlError(
      error instanceof Error ? error.message : "The external URL is invalid.",
    )
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeExternalUrlError("Only HTTP and HTTPS links are supported.")
  }

  if (url.username || url.password) {
    throw new UnsafeExternalUrlError("External links cannot contain credentials.")
  }

  if (!url.hostname) {
    throw new UnsafeExternalUrlError("The external URL hostname is missing.")
  }

  return url.toString()
}
