# ADR 0001: Use ZIPFoundation for iOS SCORM package extraction

- Status: Accepted
- Date: 2026-09-10

## Context

Chamilo Mobile already has one `ScormPackageHost` contract and an Android `ChamiloScormPackage` implementation. Native SCORM playback needs the downloaded ZIP to be extracted into app-private storage and then exposed to the existing iframe through a local URL.

The web SCORM host is intentionally restricted to local Vite development and cannot be reused as a production iOS fallback. Apple Foundation does not expose a general ZIP extraction API suitable for this package-host contract, and maintaining a custom ZIP/Deflate implementation would add unnecessary security and maintenance risk.

## Decision

Pin `ZIPFoundation` version `0.9.20` as an iOS Swift Package Manager dependency in the Xcode project and use it only for SCORM archive reading/extraction.

The app keeps its own security policy around the library:

- maximum 20,000 archive entries;
- maximum 100 MB compressed package size;
- maximum 1 GB total uncompressed size;
- reject `..`, drive-prefixed and NUL-containing paths;
- reject symbolic-link entries;
- reject duplicate normalized file paths;
- extract with CRC verification enabled;
- keep uncontained symlinks disabled;
- validate the extracted tree again before activation;
- keep packages in app-private Application Support storage and exclude the SCORM cache from iCloud backup.

The existing Capacitor file URL conversion remains the serving mechanism. No embedded HTTP server and no new backend endpoint are introduced.

## Alternatives considered

### Reuse `fflate` inside the WebView

Rejected for the native package cache. It would move large archive expansion and file persistence through the JavaScript bridge and would duplicate the already established native Android boundary.

### Implement ZIP parsing/Deflate directly in Swift

Rejected because it would create a custom archive parser for security-sensitive untrusted ZIP input.

### Use the development Service Worker/Cache Storage host on iOS

Rejected because that host is explicitly development-only and does not represent the native offline package lifecycle.

## Consequences

The Xcode project must resolve one additional MIT-licensed Swift package before an iOS build. Its exact version and license are recorded in `THIRD_PARTY_NOTICES.md`.

Linux can validate Swift syntax, the Foundation-only path resolver, TypeScript tests and project wiring, but Xcode compilation and real SCORM 1.2/2004 runtime behavior still require macOS/iPhone validation.
