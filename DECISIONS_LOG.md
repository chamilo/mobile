# DECISIONS_LOG

## Foundational decisions confirmed

### ADR-001 — Independent mobile client

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

`mobile/master` is an empty application baseline. The 1.x app is Cordova/Backbone and the LMS SPA is server-coupled.

#### Decision

Build a local Vue application packaged by Capacitor. Do not load the remote Chamilo SPA in a WebView and do not open legacy pages with silent autologin.

#### Consequences

The mobile app owns its router, UI, stores, API clients and local assets.

#### Evidence

- `mobile-master/README.md`
- `mobile-1x-reference/www/src/app.js`
- `lms-master/assets/vue/App.vue`

---

### ADR-002 — Separate repositories and PRs

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Decision

Mobile implementation stays in `chamilo/mobile`. Confirmed API gaps stay in `chamilo/chamilo-lms`, using separate branches, commits and PRs.

---

### ADR-003 — REST/API Platform first

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

API Platform REST operations exist for the MVP. GraphQL configuration exists, but no resource operations were captured and `webonyx/graphql-php` is not installed.

#### Decision

Use REST/API Platform for the MVP. Do not add or consume GraphQL in Chat 01-09.

#### Revisit when

A later audit proves runtime coverage, authorization correctness and measurable benefit.

---

### ADR-013 — TypeScript for the new application

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

The project starts from no source code. API response shapes, campus namespacing, course/session context and transport/storage boundaries benefit from compile-time contracts. Existing LMS services are JavaScript and are coupled to browser globals/Axios singletons.

#### Decision

Use TypeScript with Vue 3 Composition API and `<script setup>`. Adapt reusable concepts from LMS JavaScript rather than copying files unchanged.

#### Alternatives

- JavaScript: rejected because it saves little migration work in an empty repository and weakens contract validation.

#### Consequences

API DTOs, context objects, stores and adapters are typed. Strictness is introduced incrementally; unsafe blanket casts are not accepted.

#### Evidence

- LMS locks TypeScript `5.9.3`.
- The repository has no existing JavaScript source to preserve.

---

### ADR-014 — Yarn 4.17.1 through Corepack

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

The LMS declares `packageManager: yarn@4.17.1` and includes a Yarn lockfile. Mobile `master` has no package manager.

#### Decision

Use Yarn `4.17.1`, activated by Corepack, and commit a single `yarn.lock`. Do not add npm or pnpm lockfiles.

#### Consequences

The mobile and backend frontend toolchains share the package-manager family and exact Yarn version. Local Corepack/Yarn availability must pass before scaffolding.

---

### ADR-015 — Chat 01 version baseline

```text
Status: Superseded
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Decision

Use this baseline:

| Dependency/tool    | Version policy                                      |
| ------------------ | --------------------------------------------------- |
| Node               | `>=22.12.0 <23`                                     |
| Yarn               | `4.17.1` exact                                      |
| Vue                | `3.5.35`                                            |
| Vue Router         | `5.1.0`                                             |
| Pinia              | `3.0.4`                                             |
| vue-i18n           | `11.4.4`                                            |
| Tailwind CSS       | `3.4.19`                                            |
| PrimeVue           | `4.5.5`                                             |
| TypeScript         | `5.9.3`                                             |
| Axios              | `1.16.1`                                            |
| ESLint             | `10.4.1`                                            |
| Prettier           | `3.8.3`                                             |
| Vite               | `8.x`; resolve and lock exact patch once in Chat 01 |
| Vitest             | `5.x`; resolve and lock exact patch once in Chat 01 |
| Capacitor core/CLI | `8.x`; resolve and lock exact patch once in Chat 01 |

#### Context

The application should align with dependencies already proven in `chamilo-lms` where practical. Newly introduced Vite/Vitest/Capacitor majors require Node 22.12+ as the common supported floor.

#### Consequences

No dependency upgrades are mixed into later feature batches. The lockfile produced in Chat 01 becomes the source of truth.

#### Revisit when

A security fix, incompatibility or upstream maintenance requirement is demonstrated.

---

### ADR-016 — Selective PrimeVue

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Decision

Install PrimeVue `4.5.5`, but use it only when it reduces implementation/accessibility work for a non-trivial component. Use Vue/Tailwind for simple cards, headers, buttons and states.

#### Consequences

No desktop PrimeVue layout is copied. Bundle impact and touch behavior remain reviewable.

---

### ADR-017 — Capacitor 8 configuration without native platforms

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

Capacitor 8 is the current official major and requires Node 22+. Android is the first native target, but native generation belongs to Chat 07.

#### Decision

Chat 01 installs and configures `@capacitor/core` and `@capacitor/cli` major 8 only. It does not install `@capacitor/android`, does not create `android/`, and does not add iOS.

#### Consequences

The web scaffold remains small and reviewable. Native project ownership, generated files and CI are decided later.

---

### ADR-018 — Testing baseline

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Decision

Use:

```text
Vitest 5
Vue Test Utils
jsdom
ESLint
Prettier
```

Chat 01 includes smoke tests for application mount, router placeholders and i18n. Playwright/E2E is deferred to Chat 09. Android manual testing begins when the Android project exists.

#### Consequences

Every batch can add unit/component coverage without introducing E2E infrastructure prematurely.

---

### ADR-019 — Browser/native transport boundary

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

The LMS uses Axios and JSON-LD negotiation. The mobile app must support browser development and native requests without coupling screens to a concrete library.

#### Decision

```text
HttpClient
├── BrowserHttpClient → Axios
└── NativeHttpClient → CapacitorHttp
```

The interface owns base URL, headers, timeout, cancellation, response parsing and normalized errors. Screens and stores never import Axios, `fetch` or CapacitorHttp directly.

Chat 01 records the boundary only. Browser implementation belongs to Chat 02. Native implementation is audited in Chat 02/07 and must not weaken TLS verification.

#### Consequences

Existing LMS request/Hydra concepts are adapted behind a typed boundary. Course/session context is passed explicitly, not read globally from `window.location`.

---

## Chat 00 gate verification — 2026-07-16

This is evidence for accepted ADRs, not a new architecture decision.

### Repository verification

```text
Mobile: /var/www/chamilo-mobile, master, 3b06a5e3d0c712e8bcb52f2ff10485da57553ca7, clean
LMS: /var/www/chamilo2, master, 984b7fc7fcd8c382b61a6399904b373787b83aa8, clean
```

### Toolchain verification

```text
Node: 18.19.1 — does not satisfy ADR-015
Corepack: not found — does not satisfy ADR-014
Yarn: 1.22.22 — does not satisfy ADR-014
```

### Consequence

ADR-014 and ADR-015 remain Accepted. The local environment must be corrected before Chat 01; the project must not lower its version baseline merely to match the currently installed legacy toolchain.

### Runtime contract verification

The collector was executed without `CAMPUS_URL` and `TEST_USERNAME`, so no runtime JWT, CORS or authenticated API evidence was produced. Static contracts remain valid but runtime status remains pending.

---

## Chat 00 closure evidence — 2026-07-16

This section records verification evidence and does not introduce a new architecture decision.

### Toolchain

```text
Node: 22.23.1 — PASS
Corepack: 0.34.6 — PASS
Yarn: 4.17.1 — PASS
```

### JWT authentication contract

```text
Method: POST
Path: /api/authentication_token
Request JSON fields: username, password
Valid credentials: HTTP 200
Success response: JSON object containing token
Invalid credentials: HTTP 401 with code/message JSON
JWT refresh: not available
```

The token value and password were not stored in the project evidence.

### CORS

A preflight request from `http://localhost:5173` returned HTTP 200 with:

```text
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: content-type, authorization, preload, fields, x-prefer-html-errors
```

### Backend defect discovered during verification

An empty `var/log/ids/ids.log` can make `LoginAttemptLoggerHelper` calculate a negative line index and throw `SplFileObject::seek()` during login. The local empty file was moved to `/tmp` to unblock verification. No source-code change was made in Chat 00. The defect is recorded separately and does not block the mobile scaffold.

---

### ADR-020 — Exact Chat 01 dependency baseline

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

Chat 01 had to resolve exact patches and produce an immutable Yarn lockfile. The previous proposal named Vitest `5.x`, but no stable Vitest 5 release exists. Yarn 4.17.1 also quarantined packages published too recently, including Vite 8.1.5 and Capacitor 8.4.2. Disabling that supply-chain protection was rejected.

#### Decision

Use the exact dependency versions committed in `package.json` and `yarn.lock`, including:

| Package/tool         | Exact version |
| -------------------- | ------------: |
| Node local reference |     `22.23.1` |
| Yarn                 |      `4.17.1` |
| Vue                  |      `3.5.35` |
| Vue Router           |       `5.1.0` |
| Pinia                |       `3.0.4` |
| vue-i18n             |      `11.4.4` |
| Tailwind CSS         |      `3.4.19` |
| PrimeVue             |       `4.5.5` |
| PrimeIcons           |       `7.0.0` |
| Axios                |      `1.16.1` |
| TypeScript           |       `5.9.3` |
| Vite                 |       `8.1.4` |
| Vitest               |      `4.1.10` |
| Capacitor core/CLI   |       `8.4.1` |
| ESLint               |      `10.4.1` |
| Prettier             |       `3.8.3` |

PrimeVue remains selective and is configured without introducing a global visual theme. Yarn `packageExtensions` only repairs missing peer metadata for PrimeVue packages; it does not patch runtime source code.

#### Alternatives

- Vitest `5.x`: rejected because no stable release exists.
- Vite `8.1.5`, Capacitor `8.4.2`, `@vitejs/plugin-vue` `6.0.8`: rejected for this lockfile because Yarn's minimum-age protection quarantined the newly published releases.
- Disable Yarn's age gate: rejected because it weakens the default supply-chain protection without a project need.

#### Consequences

- `yarn install --immutable` is reproducible.
- Feature batches must not update these versions incidentally.
- Security or compatibility upgrades require a separate dependency decision and validation batch.

#### Evidence

- `package.json`
- `yarn.lock`
- `reports/VALIDATION.txt`

#### Revisit when

A demonstrated security fix, compatibility issue or upstream maintenance requirement justifies an upgrade.

---

### ADR-021 — Campus profile persistence boundary

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

Campus profiles are non-secret configuration, but views and stores must not depend directly on browser-only persistence APIs. A native implementation will be needed later without rewriting the UI.

#### Decision

Persist the global campus index through:

```text
CampusProfileRepository
└── BrowserCampusProfileRepository → localStorage
```

`CampusView` and the Pinia store do not import `localStorage`. The repository stores only campus profile metadata and the selected campus ID. Passwords and JWTs are never part of this snapshot.

Future sensitive and cached data uses explicit campus namespaces:

```text
campusId/token
campusId/profile
campusId/cache
campusId/settings
```

#### Alternatives

- Direct `localStorage` access from components/store: rejected because it couples the application layer to the browser and makes native migration unsafe.
- A secure-storage plugin in Chat 02: rejected because campus profiles are not secrets and the plugin decision belongs to the security/native batch.
- Database abstraction: rejected as unnecessary for the MVP campus index.

#### Consequences

- Campus profile persistence can be replaced for native platforms.
- Corrupted storage is surfaced as an error instead of being silently overwritten.
- Token storage remains a separate contract and is not implemented in Chat 02.

#### Evidence

- `src/services/campus/CampusProfileRepository.ts`
- `src/services/campus/BrowserCampusProfileRepository.ts`
- repository/store unit tests

#### Revisit when

The Android persistence and secure-token-storage implementations are selected.

---

### ADR-022 — Campus URL security policy

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

The mobile application accepts user-provided campus addresses. Unsafe normalization could leak credentials, permit unsupported protocols or silently connect to a different host.

#### Decision

- Add HTTPS when the user omits a protocol.
- Allow only HTTP and HTTPS.
- Reject embedded username/password, query strings and fragments.
- Preserve valid subdirectory installations.
- Remove trailing slashes.
- Require HTTPS by default.
- Permit HTTP only through an explicit development opt-in and only for localhost, `.local`, loopback or private-network hosts.
- Revalidate the URL when creating an HTTP client; production builds reject previously saved HTTP profiles.

#### Alternatives

- Accept any URL and let Axios fail: rejected because validation would happen too late and error messages would be ambiguous.
- Allow arbitrary HTTP with a checkbox: rejected because a persistent opt-in must not weaken production transport.
- Force origin-only URLs: rejected because Chamilo may be installed under a subdirectory.

#### Consequences

Campus profiles are deterministic and safer to compare. Redirects to another origin are rejected when the browser exposes the final response URL.

#### Evidence

- `src/domain/campus/normalizeCampusUrl.ts`
- `src/services/http/createHttpClient.ts`
- URL and HTTP-client unit tests

---

### ADR-023 — Browser transport and native boundary

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

ADR-019 established the transport interface. Chat 02 must implement browser transport without pretending that the Android/native contract has already been audited.

#### Decision

- Implement `BrowserHttpClient` with Axios behind `HttpClient`.
- Support relative campus paths, query parameters, body, headers, timeout and `AbortSignal`.
- Normalize configuration, timeout, cancellation, network and HTTP errors.
- Reject absolute request paths that could replace the selected campus.
- Keep `NativeHttpClient` as an explicit unsupported implementation until the Android batch.
- Use direct CORS by default.
- Provide an optional single-campus Vite proxy only when the selected campus matches the configured proxy target.

#### Alternatives

- Import Axios in each service/store: rejected because transport must remain replaceable.
- Implement Capacitor HTTP before generating/auditing Android: rejected because behavior and plugin compatibility are not yet verified.
- Always proxy browser requests: rejected because a static proxy target conflicts with the multi-campus model.

#### Consequences

No screen imports Axios or `fetch`. Native use fails clearly rather than silently falling back to an unverified browser transport.

#### Evidence

- `src/services/http/HttpClient.ts`
- `src/services/http/BrowserHttpClient.ts`
- `src/services/http/NativeHttpClient.ts`
- `vite.config.ts`

---

### ADR-024 — JWT authentication bootstrap

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

The browser runtime verified `POST /api/authentication_token`, and backend commit `ba1f018207` added the minimum authenticated profile contract at `GET /api/me` with AccessUrl enforcement.

#### Decision

- Authenticate with `username` and `password` only against the selected campus.
- Treat the returned JWT as an opaque credential except for client-side expiration parsing.
- Load the current profile immediately through `GET /api/me` before accepting the session.
- Store the JWT only after both operations succeed.
- Protect authenticated routes through a Pinia auth store and Vue Router guards.
- Use the dedicated minimal profile contract instead of generic `/api/users/{id}`.
- Implement logout as local token/profile cleanup because no server-side JWT logout operation exists.

#### Alternatives

- Use the web login session and cookies: rejected because the app is an independent API client.
- Decode the JWT to build the profile: rejected because claims are not the verified profile contract.
- Call `/api/users/{id}`: rejected because the client does not know a trusted ID before profile bootstrap and the resource is broader than required.
- Add refresh tokens: rejected because no verified refresh contract exists.

#### Consequences

The mobile session is accepted only after the JWT and AccessUrl-scoped profile both succeed. Invalid or expired sessions are removed without retrying an invented refresh flow.

#### Evidence

- Runtime JWT HTTP 200/401 checks.
- Backend commit `ba1f018207`.
- `src/services/auth/AuthApiService.ts`.
- `src/stores/auth.ts`.
- `src/router/authGuards.ts`.

#### Revisit when

A verified refresh-token or external identity-provider contract is proposed.

---

### ADR-025 — Token storage and lifecycle boundary

```text
Status: Accepted
Date: 2026-07-16
Owners: Chamilo Mobile maintainers
```

#### Context

JWTs are sensitive and must remain isolated by campus. The browser scaffold is for development, while native secure storage has not yet been audited or selected.

#### Decision

```text
TokenStorage
├── DevelopmentTokenStorage → memory only
└── SecureNativeTokenStorage → explicit unsupported boundary until Chat 08
```

- Namespace every token by `campusId/token`.
- Never store passwords.
- Do not persist JWTs in browser localStorage or sessionStorage.
- Parse `exp` when present and reject expired tokens before protected requests.
- Keep tokens without `exp` usable because the backend contract does not require the claim, but still validate them through `/api/me`.
- Remove the campus token on logout, session expiration, AccessUrl denial, campus removal or campus connection-address change.
- Provide `AuthenticatedHttpClient` so later API services receive Authorization without importing token storage.

#### Alternatives

- Browser localStorage: rejected because it unnecessarily persists a bearer token.
- Choose a native plugin now: rejected until maintenance, license, Capacitor 8 and keystore behavior are audited.
- Put token handling inside views: rejected because it breaks the transport/storage boundaries.

#### Consequences

A browser reload intentionally requires a new login during development. Native authentication fails explicitly until secure storage is implemented, rather than silently using unsafe persistence.

#### Evidence

- `src/services/auth/TokenStorage.ts`.
- `src/services/auth/DevelopmentTokenStorage.ts`.
- `src/services/auth/SecureNativeTokenStorage.ts`.
- token namespace and auth store tests.

---

### ADR-026 — Compose direct courses and sessions in the mobile client

```text
Status: Accepted
Date: 2026-07-17
Owners: Chamilo Mobile maintainers
```

#### Context

Runtime evidence confirmed four existing authenticated REST collections:

- `/api/me/courses` for direct `CourseRelUser` memberships;
- past, current and upcoming session subscriptions for the authenticated `/api/me` ID.

The direct collection preserves the membership IRI and role/progress fields. Session collections preserve session identity and include their `SessionRelCourse` identities and course data. Their pagination policies differ, but all use Hydra collections.

#### Decision

- Do not add a composed backend endpoint for the MVP.
- Fetch the four existing collections in parallel through `AuthenticatedHttpClient`.
- Follow Hydra pagination only through relative same-campus links.
- Keep direct and session enrollments as separate typed models.
- Preserve direct `membershipId`, session `sessionId` and `sessionCourseId` in mobile navigation.
- Cache the normalized overview by both campus ID and authenticated user ID.
- Clear cached and in-memory course data on logout, expiration or access denial.

#### Alternatives

- Add one backend mobile endpoint: rejected because the existing operations are secure and sufficient, and measured runtime evidence did not demonstrate a blocking cost.
- Deduplicate by course ID: rejected because the same course can be a direct enrollment and appear in one or more sessions with different context.
- Copy LMS desktop course/session views: rejected because they depend on web security state, desktop components and legacy navigation.

#### Consequences

The MVP makes four authenticated collection requests on first load and normalizes them in the client. Course context remains explicit and reversible. A future composed Provider requires new performance evidence rather than convenience alone.

#### Evidence

- Chat 04 sanitized runtime payloads and HTTP status report.
- `UserCourseSubscriptionsStateProvider` and `UserSessionSubscriptionsStateProvider`.
- LMS `courseService.js`, `sessionService.js`, `SessionCardSimple.vue` and Hydra collection handling.
- `src/services/courses/CoursesApiService.ts`.
- `src/domain/courses/types.ts`.
- `src/stores/courses.ts`.

#### Revisit when

A representative production dataset demonstrates unacceptable request count, payload size or latency.

---

### ADR-027 — Mobile-owned course home and explicit capabilities

```text
Status: Accepted
Date: 2026-07-17
Owners: Chamilo Mobile maintainers
```

#### Context

The LMS SPA loads course-home shortcuts through `/course/{cid}/home.json`. The controller uses the web course/session context, clears and writes PHP session values, registers web tracking events, resolves plugins and emits shortcuts that can point to legacy tools or remote web routes. Copying that response into the mobile application would reintroduce hidden coupling and silent legacy navigation.

The mobile app already has a verified enrollment context from Chat 04 and verified announcement list/detail contracts from Chat 00.

#### Decision

- Build the course home entirely inside `chamilo/mobile`.
- Resolve the selected course only from the exact direct membership or session-course identity carried by the route.
- Reject mixed, incomplete or mismatched route context.
- Define an explicit typed `ToolCapability` registry with:
  - `toolKey`;
  - availability;
  - read-only flag;
  - reason;
  - mobile route;
  - verified API contract.
- Expose only Announcements in Chat 05 because its list/detail operations and permission behavior are verified.
- Keep announcement content as a placeholder until Chat 06.
- Do not call `/course/{cid}/home.json`, open the remote SPA or follow legacy shortcuts.

#### Alternatives

- Reuse the LMS shortcut payload directly: rejected because it mutates web session state and mixes plugins, legacy URLs and desktop behavior.
- Show all familiar tools as disabled placeholders: rejected because visibility would imply unsupported capabilities.
- Hardcode mobile routes in the view: rejected in favor of a registry that keeps route and API evidence together.

#### Consequences

The initial course home intentionally contains only one tool. New tools require a verified contract and permission behavior before registration. Direct and session contexts remain distinct through course home and announcement navigation.

#### Evidence

- `assets/vue/services/courseService.js::loadTools()`.
- `CourseController::indexJson()` for `/course/{cid}/home.json`.
- verified announcement list/detail contracts and context validation.
- `src/domain/courseHome/toolCapabilities.ts`.
- `src/domain/courseHome/resolveCourseHome.ts`.

#### Revisit when

A stable API Platform course-capability operation exists and can replace or populate the registry without exposing legacy links.

---

### ADR-028 — Read-only announcements use student-view contracts and a sanitizer boundary

```text
Status: Accepted
Date: 2026-07-17
Owners: Chamilo Mobile maintainers
```

#### Context

The LMS already exposes dedicated API Platform Providers for announcement list and detail. They validate course, session, group, permissions, visibility and recipients. The operations can return management flags and CSRF tokens for teachers unless `isStudentView=true` is requested. Announcement detail content is HTML processed for the current reader and must still be treated as untrusted client content.

#### Decision

- Consume only:
  - `GET /api/announcement/list`;
  - `GET /api/announcement/{id}`.
- Always send the preserved `cid` and optional `sid` from the exact mobile course route.
- Omit `gid` until a verified mobile group-course flow exists.
- Always send `isStudentView=true` so the MVP receives only visible read-only content and no management capability.
- Verify that every response returns the same `courseId`, `sessionId` and null `groupId` requested by the mobile context.
- Cache list and detail by campus, authenticated user and exact enrollment context.
- Render HTML only after `sanitizeAnnouncementHtml` removes executable/embedded elements, event/style attributes and unsafe URLs.
- Resolve links against the campus, open them with web safety attributes and allow images only from the selected campus origin.
- Show attachment metadata from the verified detail contract, but defer authenticated binary download until native/browser file handling is designed.

#### Alternatives

- Copy LMS announcement Vue views: rejected because they include write actions, CSRF handling, desktop components and management state.
- Render backend HTML directly with `v-html`: rejected because server content remains untrusted.
- Request teacher view but hide buttons: rejected because unnecessary management metadata and CSRF tokens would still cross the API boundary.
- Open attachment URLs as normal anchors: rejected because the JWT is memory-only and direct browser navigation would not attach Authorization safely.
- Add a new mobile announcement endpoint: rejected because the existing Providers already enforce the required context and permissions.

#### Consequences

Teachers using the MVP see the same visible read-only announcement set as a student view. Management and recipient details remain outside the mobile client. Attachment names and sizes are visible, but file download waits for a verified authenticated binary transport/file lifecycle.

#### Evidence

- `AnnouncementList` and `AnnouncementItem` ApiResources.
- `AnnouncementListProvider` and `AnnouncementItemProvider` context/permission checks.
- LMS `announcementService.js` list/detail paths.
- `src/services/announcements/AnnouncementsApiService.ts`.
- `src/domain/announcements/sanitizeAnnouncementHtml.ts`.
- `src/stores/announcements.ts`.

#### Revisit when

- group-course navigation is implemented;
- authenticated attachment downloading is designed for browser and Android;
- representative runtime data demonstrates a pagination or payload-size gap;
- announcement management becomes an approved feature.

---

## ADR-029 — Commit Android platform and use explicit CapacitorHttp transport

```text
Status: Accepted
Date: 2026-07-17
Owners: Chamilo Mobile maintainers
```

### Context

Capacitor 8 requires the Android platform package and a generated Android Studio project. The browser client already depends on a transport interface, while the native adapter was intentionally unsupported.

### Decision

- Add `@capacitor/android` 8.4.1 and `@capacitor/app` 8.1.0.
- Generate and commit first-party `android/` source and configuration.
- Ignore generated/local Android outputs, copied web assets, SDK paths and signing material.
- Implement `NativeHttpClient` with direct `CapacitorHttp.request` calls behind `HttpClient`.
- Keep global `fetch`/`XMLHttpRequest` patching disabled.
- Disable redirects and reject response URLs on another origin.
- Register the Android back button through the official App plugin.
- Require valid HTTPS in production and never bypass certificate validation.

### Consequences

Android builds are reproducible from version control. Native requests avoid browser CORS while preserving campus-origin, authorization and error boundaries.

### Revisit when

Secure native token storage and authenticated file downloads are implemented.

---

## ADR-030 — Keep a reproducible dependency-license gate

```text
Status: Accepted
Date: 2026-07-17
Owners: Chamilo Mobile maintainers
```

### Decision

- Keep Chamilo Mobile under AGPL-3.0.
- Record direct Android additions and required MIT notices in `THIRD_PARTY_NOTICES.md`.
- Generate `reports/LICENSE_AUDIT.md` from the exact Yarn `node_modules` installation.
- Include `package.json` and `yarn.lock` hashes in the report.
- Fail the engineering gate for missing metadata and known restricted terms such as BUSL, SSPL, Commons Clause, PolyForm, non-commercial and proprietary licenses.
- Do not add a third-party license-audit dependency.

### Limitation

The automated inventory covers JavaScript package metadata. Android/Gradle dependencies still need a dedicated release review before store distribution. The gate does not replace legal advice.
