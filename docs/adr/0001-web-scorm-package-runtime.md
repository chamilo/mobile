# ADR 0001: Local web SCORM package runtime

- Status: Accepted
- Date: 2026-08-30

## Context

Chamilo Mobile uses a native Android host to download and extract real SCORM packages. The browser development host previously accepted only fixed local fixtures, which made failures in real SCORM 1.2 and SCORM 2004 packages difficult to diagnose with browser DevTools.

A real browser host must preserve relative package URLs and the same-origin relationship between the SCO iframe and the parent page so that `window.API` (SCORM 1.2) and `window.API_1484_11` (SCORM 2004) remain discoverable. It must not expose the JWT in URLs or bypass the existing authenticated `HttpClient` download path.

## Decision

Add `fflate@0.8.3` as a direct runtime dependency for ZIP extraction in local Vite development. `fflate` is MIT licensed, has no runtime dependencies, supports browser ZIP extraction, and exposes per-entry metadata before extraction so package entry count and declared uncompressed size can be bounded.

Real browser SCORM packages are downloaded through the existing authenticated `LearningPathApiService`, extracted in memory, stored in Cache Storage under a campus/user/course/LP/fingerprint-derived namespace, and served from same-origin virtual URLs by a narrow service worker. The service worker only handles `/__scorm-web-packages/` and only serves cached `GET`/`HEAD` requests. Android continues to use `NativeScormPackageHost` unchanged.

The browser host is deliberately restricted to Vite development on localhost. It is a debugging and regression-validation path, not a production PWA/offline feature.

## Security and limits

- No password or JWT is stored in the SCORM cache or placed in URLs.
- Package scopes are hashed before becoming Cache Storage names or virtual paths.
- Local web debug playback accepts compressed packages up to 512 MB; Android keeps its separate 100 MB native bridge limit until streaming installation replaces the current base64 bridge.
- Browser extraction is capped at 20,000 ZIP entries and 512 MB declared/actual uncompressed data.
- Absolute paths, drive-letter paths and `..` traversal are rejected.
- Duplicate normalized file paths are rejected.
- Launch fallback is allowed only for a unique safe suffix match.
- Campus cleanup removes browser SCORM caches together with the existing offline-campus cleanup.

## Consequences

Browser DevTools can now inspect real SCORM 1.2/2004 launch pages, assets, JavaScript API calls and network failures. The browser path consumes memory while extracting the archive and therefore intentionally has a stricter uncompressed-size ceiling than the Android native cache. Production web playback remains outside the current mobile MVP.
