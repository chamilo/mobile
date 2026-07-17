export type HttpClientErrorKind =
  | "configuration"
  | "network"
  | "timeout"
  | "aborted"
  | "http"
  | "redirect"
  | "unsupported"

export class HttpClientError extends Error {
  public readonly originalError: unknown

  constructor(
    public readonly kind: HttpClientErrorKind,
    message: string,
    public readonly status?: number,
    originalError?: unknown,
  ) {
    super(message)
    this.name = "HttpClientError"
    this.originalError = originalError
  }
}
