# Chamilo Mobile 2.x

Independent mobile client for Chamilo LMS 2.1+.

The application uses Vue 3, TypeScript, Vite and Capacitor. It consumes verified REST/API Platform contracts and does not load the remote Chamilo SPA or legacy pages through silent autologin.

## Current status

Implemented:

- campus profiles and browser/native transport interfaces;
- JWT login, current-user profile and logout;
- secure native JWT persistence on Android;
- iOS `ChamiloSecureStorage` Keychain bridge source, wired into the Capacitor bridge controller;
- direct courses and session courses;
- mobile-owned course home;
- read-only announcements with sanitized HTML and isolated cache;
- Capacitor Android project;
- native HTTP through `CapacitorHttp`;
- Android back-button handling;
- personal social messaging with inbox, sent messages, compose, reply, search, read state, stars and per-user deletion;
- Android push permission, FCM token registration and authenticated logout cleanup;
- iOS APNs permission/device-token registration source, sharing the authenticated installation lifecycle;
- iOS `ChamiloDocument` bridge source using Quick Look for preview and the system document picker for export;
- safe message opening from Android notification actions;
- Android biometric session unlock;
- iOS `ChamiloBiometric` LocalAuthentication bridge source for Touch ID / Face ID;
- native shell safe-area handling;
- reproducible JavaScript dependency-license report;
- debug APK build and physical Android installation;
- iOS Capacitor dependency, SPM project-generation scripts and a restricted iOS plugin allowlist for preparation work.

Not implemented or not validated yet:

- authenticated attachment downloads;
- public HTTPS test campus;
- message attachment upload/download in the mobile messaging UI;
- iOS Keychain secure-token bridge Xcode/simulator/device validation;
- iOS Touch ID / Face ID Xcode/simulator/device validation;
- iOS APNs signing credentials and physical delivery validation;
- iOS native document open/save Xcode/simulator/device validation;
- iOS native SCORM package hosting/offline runtime;
- iOS build, signing, simulator/device validation or TestFlight/App Store delivery;
- store publication and release signing.

## Requirements

Shared development requirements:

```text
Node >=22.12.0 <23
Yarn 4.17.1 through Corepack
```

Android requirements:

```text
Java 21
Android SDK Platform 36
Android SDK Build Tools 35+
```

A macOS/Xcode environment is still required to compile, sign, run and distribute the iOS application. The repository can prepare the Capacitor iOS project before that validation step.

## Install

```bash
corepack enable
corepack install --global yarn@4.17.1
yarn install --immutable
```

## Web development

```bash
yarn dev
```

The browser build requires campus CORS unless the explicit local Vite proxy is enabled. See `.env.example`.

## Quality gates

```bash
yarn licenses:audit
yarn format:check
yarn lint
yarn typecheck
yarn test:unit
yarn build
```

## Android

Configure the local SDK without committing its path:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
```

Synchronize and build:

```bash
yarn android:sync
yarn android:build:debug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties`, Gradle outputs, copied web assets, APKs and signing material are not committed.

### Firebase Cloud Messaging

Register the Android application ID `org.chamilo.mobile` in the Firebase project, then copy the project-specific configuration to:

```text
android/app/google-services.json
```

Never commit this file. After adding it, synchronize and build again with the Android push build flags enabled.

The selected Chamilo campus must expose the authenticated `POST /api/mobile_push_installations` and `DELETE /api/mobile_push_installations/{installationId}` operations. The app stores only a campus-scoped installation UUID and registration owner; the FCM token is sent to the selected campus and is not persisted by the web layer.

The message inbox remains available without Firebase. It uses the authenticated `/api/mobile_messages` and `/api/mobile_message_recipients` operations. Firebase only adds native delivery. A notification action opens a message only when its installation identifier matches the active campus and authenticated user.

## iOS preparation

The repository declares `@capacitor/ios` at the same Capacitor platform version used by Android/Core/CLI and provides an SPM-based project-generation command.

On Linux, after applying the iOS preparation batch, run:

```bash
yarn ios:prepare:linux
```

That command:

1. updates `yarn.lock` for the newly declared `@capacitor/ios` dependency;
2. builds the Vue application;
3. creates `ios/` with `cap add ios --packagemanager SPM`, or synchronizes it when it already exists;
4. verifies that the Xcode project and `CapApp-SPM/Package.swift` were generated.

The generated `ios/` project is source and should be reviewed and committed. Xcode build/signing is intentionally not claimed by this Linux step.

### Current iOS capability boundary

The iOS plugin allowlist keeps push opt-in behind the same explicit build flags used by Android. When push is enabled, `@capacitor/push-notifications` is included for iOS and the native AppDelegate forwards APNs registration callbacks to Capacitor.

The iOS source now includes an app-local `ChamiloSecureStorage` implementation backed by Apple Keychain. It keeps the existing `campusId/token` key contract, uses a device-only Keychain accessibility class, and is registered explicitly from a custom Capacitor bridge view controller. Because this batch is prepared on Linux, Xcode compilation and a real Keychain round trip are still unvalidated.

The iOS source now also includes a `ChamiloBiometric` implementation backed by Apple LocalAuthentication. It uses the existing app-level biometric session gate, supports the same `status()` / `authenticate()` contract as Android, and adds the required Face ID privacy usage description. It does not cryptographically bind the Keychain item to biometrics; it protects access to an already remembered secure session in the same way as the Android implementation. Xcode compilation and real Touch ID / Face ID behavior remain unvalidated.

The iOS `ChamiloDocument` bridge now mirrors the existing document presenter contract: it writes the authenticated blob to a temporary app file, previews supported formats with Quick Look, and exports copies through the system document picker. This source still requires Xcode/simulator/device validation before iOS document handling can be described as validated.

The following native Chamilo bridge is still Android-only and must be implemented and validated separately before iOS can be considered functionally complete:

- native SCORM package hosting.

iOS push source now uses the APNs device token produced by the official Capacitor Push Notifications plugin and registers it with the campus as platform `ios`. Delivery requires the Chamilo backend APNs provider to be configured with Apple provider credentials and still needs Xcode/device validation. No Firebase Apple SDK or `GoogleService-Info.plist` is required by this direct APNs path. Remember me is wired to the Keychain-backed bridge in source, but must not be described as validated on iPhone until the Xcode/device checks pass.

When a Mac becomes available, the first validation commands are:

```bash
yarn ios:sync
yarn ios:open
```

Then validate the Xcode build, run a Keychain persistence/logout round trip, and verify biometric enable/cancel/unlock behavior with Touch ID or Face ID before enabling additional iOS-native capabilities.

Do not commit Apple signing material, provisioning profiles, private keys or `GoogleService-Info.plist`.

## Architecture boundaries

All network calls pass through:

```text
HttpClient
├── BrowserHttpClient
└── NativeHttpClient
```

Views and stores do not import Axios, `fetch`, Capacitor HTTP, `localStorage` or native storage plugins directly.

Persistence is also abstracted and namespaced by campus:

```text
campusId/token
campusId/profile
campusId/cache
campusId/settings
campusId/push-installation
```

JWTs use native secure storage on Android. iOS now has a Keychain-backed implementation in source, with Xcode/device validation still pending. Passwords are never stored, and JWTs and push tokens must not be logged or passed in query strings.

## Native transport security

- request paths must remain relative to the selected campus;
- redirects are disabled;
- response URLs on another origin are rejected;
- no global `fetch`/XMLHttpRequest patch is enabled;
- no certificate-validation bypass is allowed;
- valid HTTPS is required for non-local production campuses.

## Licenses

Chamilo Mobile remains AGPL-3.0. Direct official Capacitor packages are MIT-licensed. See:

```text
THIRD_PARTY_NOTICES.md
reports/LICENSE_AUDIT.md
```

The JavaScript audit is an engineering safeguard. Android/Gradle and future iOS/SPM release notices require dedicated review before public store distribution.
