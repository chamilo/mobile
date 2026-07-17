# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-17 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Branch: feature/mobile2-android
Base HEAD: f3defd1048d8b9b453f85128dc231b6029987b20
Expected commit: Mobile: Add Android Capacitor platform
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: feature/mobile-api-current-user
HEAD: ba1f018207 API: Add authenticated user profile operation
Chat 07 backend changes: none
```

## Current phase

```text
Chat: 07
Batch: Capacitor Android platform, native transport and license gate
Status: Implemented and validated; pending final apply verification and commit
```

## Completed capabilities

- [x] Independent Vue 3/TypeScript/Vite application.
- [x] Campus profiles and browser/native `HttpClient` boundary.
- [x] JWT login, current-user profile and logout.
- [x] Direct courses and session courses with context-preserving navigation.
- [x] Mobile-owned course home with explicit `ToolCapability` registry.
- [x] Read-only announcement list and detail with sanitizer and offline cache.
- [x] Capacitor Android platform committed as first-party source.
- [x] `NativeHttpClient` implemented with `CapacitorHttp`.
- [x] Cross-origin redirect rejection and no certificate bypass.
- [x] Android back-button integration through `@capacitor/app`.
- [x] Android debug APK built and installed on an LG K42.
- [x] JavaScript license inventory and direct MIT notices.

## Confirmed validation

```text
Formatting: PASS
ESLint: PASS
TypeScript: PASS
Unit tests: 35 files / 103 tests PASS
Vite build: PASS
Capacitor sync: PASS
Gradle assembleDebug: PASS
Physical APK installation: PASS
```

## Honest limitations

- JWT remains memory-only; force-close or process death requires a new login.
- Secure native token storage is not implemented.
- Announcement attachment download is not implemented.
- `chamilo2.local` is not a phone-reachable public campus.
- Full Android API flow awaits a reachable HTTPS test server.
- iOS, push, biometrics, background sync and store publication remain out of scope.
- JavaScript license metadata is audited; Android/Gradle release notices require a later release gate.

## Next batch

```text
Chat 08 — Audit course-tool capabilities against real Chamilo LMS code, OpenAPI and role/session/group behavior.
```

The audit selects one mobile-ready tool for the following implementation branch. It does not implement every tool in one batch and does not invent missing contracts.

## Do not redo

- Do not recreate scaffold, campus, authentication, courses, course home, announcements or Android platform.
- Do not replace `HttpClient` with direct Axios, fetch or Capacitor imports in views.
- Do not add iOS yet.
- Do not add a monolithic `/mobile` backend API.
- Do not bypass TLS to reach a local campus from Android.
