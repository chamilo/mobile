# Chamilo Mobile 2.x

Independent mobile client for Chamilo LMS 2.1+.

The application uses Vue 3, TypeScript, Vite and Capacitor. It consumes verified REST/API Platform contracts and does not load the remote Chamilo SPA or legacy pages through silent autologin.

## Current status

Implemented:

- campus profiles and browser/native transport interfaces;
- JWT login, current-user profile and logout;
- secure native JWT persistence;
- direct courses and session courses;
- mobile-owned course home;
- read-only announcements with sanitized HTML and isolated cache;
- Capacitor Android project;
- native HTTP through `CapacitorHttp`;
- Android back-button handling;
- personal social messaging with inbox, sent messages, compose, reply, search, read state, stars and per-user deletion;
- Android push permission, FCM token registration and authenticated logout cleanup;
- safe message opening from Android notification actions;
- reproducible JavaScript dependency-license report;
- debug APK build and physical installation.

Not implemented yet:

- authenticated attachment downloads;
- public HTTPS test campus;
- message attachment upload/download in the mobile messaging UI;
- iOS push notifications, biometrics or background sync;
- store publication and release signing.

## Requirements

```text
Node >=22.12.0 <23
Yarn 4.17.1 through Corepack
Java 21
Android SDK Platform 36
Android SDK Build Tools 35+
```

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
printf 'sdk.dir=%s
' "$ANDROID_HOME" > android/local.properties
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

Install on an authorized device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties`, Gradle outputs, copied web assets, APKs and signing material are not committed.

### Firebase Cloud Messaging

Register the Android application ID `org.chamilo.mobile` in the Firebase project, then copy the
project-specific configuration to:

```text
android/app/google-services.json
```

Never commit this file. After adding it, synchronize and build again:

```bash
yarn android:sync
yarn android:build:debug
```

The selected Chamilo campus must expose the authenticated
`POST /api/mobile_push_installations` and
`DELETE /api/mobile_push_installations/{installationId}` operations. The app stores only a
campus-scoped installation UUID and registration owner; the FCM token is sent to the selected
campus and is not persisted by the web layer.

The message inbox remains available without Firebase. It uses the authenticated
`/api/mobile_messages` and `/api/mobile_message_recipients` operations. Firebase only adds native
delivery while Android is in the background or closed. A notification action opens a message only
when its installation identifier matches the active campus and authenticated user.

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

JWTs use native secure storage on Android. Passwords are never stored, and JWTs and FCM tokens must
not be logged or passed in query strings.

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

The JavaScript audit is an engineering safeguard. Android/Gradle release notices require a dedicated review before public store distribution.
