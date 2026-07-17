# TEST_EVIDENCE

## Technical

| Date       | Repo/artifact              | Base commit | Command                                     | Result                         |
| ---------- | -------------------------- | ----------- | ------------------------------------------- | ------------------------------ |
| 2026-07-16 | Local Chat 01              | `3b06a5e`   | User-provided full quality-gate output      | PASS                           |
| 2026-07-16 | Local Chat 01              | `3b06a5e`   | Commit                                      | PASS — `050588c`               |
| 2026-07-16 | Chat 02 isolated candidate | `050588c`   | `npx eslint . --max-warnings=0`             | PASS — zero warnings           |
| 2026-07-16 | Chat 02 isolated candidate | `n/a`       | `npx vue-tsc --noEmit -p tsconfig.app.json` | PASS                           |
| 2026-07-16 | Chat 02 isolated candidate | `n/a`       | `npx tsc --noEmit -p tsconfig.node.json`    | PASS                           |
| 2026-07-16 | Chat 02 isolated candidate | `n/a`       | `npx vitest run`                            | PASS — 10 files, 26 tests      |
| 2026-07-16 | Chat 02 isolated candidate | `n/a`       | `npx vite build`                            | PASS — Vite `8.1.4`            |
| 2026-07-16 | Chat 02 isolated candidate | `050588c`   | Dependency/lockfile comparison              | PASS — no dependency changes   |
| 2026-07-16 | Chat 02 isolated candidate | `050588c`   | Native directory check                      | PASS — no `android/` or `ios/` |
| 2026-07-16 | Chat 02 isolated candidate | `050588c`   | Direct-import security scan                 | PASS                           |

The isolated generator could not download Yarn through Corepack from `repo.yarnpkg.com`. It validated the exact locked dependency versions through the available npm registry. No dependency changed and the Chat 01 Yarn 4 lockfile is preserved unchanged. The authoritative package-manager gate remains `yarn install --immutable` in the user's local repository.

## Unit/component tests

| Test file                                                    | Coverage                                                           | Result |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ------ |
| `src/domain/campus/normalizeCampusUrl.spec.ts`               | HTTPS default, subpaths, local HTTP policy, unsafe URL rejection   | PASS   |
| `src/domain/campus/campusNamespace.spec.ts`                  | Per-campus token/cache/settings namespace isolation                | PASS   |
| `src/services/campus/BrowserCampusProfileRepository.spec.ts` | Empty snapshot, persistence, corrupted-storage error               | PASS   |
| `src/stores/campus.spec.ts`                                  | Add/select/remove and persisted state                              | PASS   |
| `src/components/campus/CampusForm.spec.ts`                   | Normalized submit and accessible validation                        | PASS   |
| `src/services/http/BrowserHttpClient.spec.ts`                | Subdirectory URLs, absolute-path rejection, redirects, HTTP errors | PASS   |
| `src/services/http/NativeHttpClient.spec.ts`                 | Explicit unsupported native transport                              | PASS   |
| `src/App.spec.ts`                                            | Default campus setup screen                                        | PASS   |
| `src/router/index.spec.ts`                                   | Root campus redirect and course route preservation                 | PASS   |
| `src/components/layout/AppHeader.spec.ts`                    | Header title                                                       | PASS   |

## Web UI

| Date          | Browser                 | Flow                            | Expected                                                        | Actual  | Evidence         |
| ------------- | ----------------------- | ------------------------------- | --------------------------------------------------------------- | ------- | ---------------- |
| Pending local | Chrome DevTools 390x844 | Campus add/edit/select/remove   | Usable touch layout, no horizontal overflow                     | Pending | User local check |
| Pending local | Chrome                  | Reload after selecting a campus | Campus list and selected campus persist                         | Pending | User local check |
| Pending local | Chrome DevTools         | Toggle network offline          | Offline banner appears; saved campuses remain visible           | Pending | User local check |
| Pending local | Chrome                  | Continue from selected campus   | Navigates to the existing login placeholder; no API call occurs | Pending | User local check |

## Android

| Date       | Device/API     | Build             | Flow                          | Expected                | Actual |
| ---------- | -------------- | ----------------- | ----------------------------- | ----------------------- | ------ |
| 2026-07-16 | Not applicable | No native project | Confirm no platform generated | No `android/` or `ios/` | PASS   |

## Security

| Date       | Test                               | Expected                                                | Actual |
| ---------- | ---------------------------------- | ------------------------------------------------------- | ------ |
| 2026-07-16 | URL credentials/query/hash         | Rejected                                                | PASS   |
| 2026-07-16 | HTTP campus policy                 | Explicit local-development hosts only                   | PASS   |
| 2026-07-16 | Production HTTP revalidation       | Saved HTTP profile cannot create a production transport | PASS   |
| 2026-07-16 | Absolute HTTP request path         | Cannot replace selected campus host                     | PASS   |
| 2026-07-16 | Cross-host final response URL      | Rejected when observable                                | PASS   |
| 2026-07-16 | Views/store direct Axios/fetch use | None                                                    | PASS   |
| 2026-07-16 | Views/store direct localStorage    | None                                                    | PASS   |
| 2026-07-16 | Password/JWT introduction          | None                                                    | PASS   |
| 2026-07-16 | Compatibility claims               | Stored as `unknown`; no endpoint invented               | PASS   |

## Pending before commit

- Run Yarn 4 immutable install and all scripts in `/var/www/chamilo-mobile`.
- Record `git diff --check` and staged diff statistics.
- Complete the local web checks.
- Record the resulting commit hash.

---

## Chat 03 — JWT authentication candidate

### Backend prerequisite

| Date       | Repo        | Branch/commit                                    | Verification              | Result                        |
| ---------- | ----------- | ------------------------------------------------ | ------------------------- | ----------------------------- |
| 2026-07-16 | chamilo-lms | `feature/mobile-api-current-user` / `ba1f018207` | Targeted PHPUnit          | PASS — 3 tests, 15 assertions |
| 2026-07-16 | chamilo-lms | `ba1f018207`                                     | Valid JWT → `GET /api/me` | PASS — HTTP 200               |
| 2026-07-16 | chamilo-lms | `ba1f018207`                                     | Missing/invalid JWT       | PASS — HTTP 401               |

### Isolated mobile candidate

| Date       | Command                                            | Result                         |
| ---------- | -------------------------------------------------- | ------------------------------ |
| 2026-07-16 | `npx prettier --write .` followed by format review | PASS                           |
| 2026-07-16 | `npx eslint . --max-warnings=0`                    | PASS — zero warnings           |
| 2026-07-16 | `npx vue-tsc --noEmit -p tsconfig.app.json`        | PASS                           |
| 2026-07-16 | `npx tsc --noEmit -p tsconfig.node.json`           | PASS                           |
| 2026-07-16 | `npx vitest run`                                   | PASS — 17 files, 47 tests      |
| 2026-07-16 | `npx vite build`                                   | PASS — Vite 8.1.4, 182 modules |
| 2026-07-16 | package/lock comparison                            | PASS — unchanged               |
| 2026-07-16 | native directory check                             | PASS — no `android/` or `ios/` |
| 2026-07-16 | views/stores direct Axios/fetch/localStorage scan  | PASS                           |
| 2026-07-16 | credential logging scan                            | PASS                           |

The isolated validation used the exact pinned packages from the available npm cache. The authoritative local package-manager gate remains `yarn install --immutable` with Yarn 4.17.1.

### Added coverage

| Test file                                           | Coverage                                                      | Result |
| --------------------------------------------------- | ------------------------------------------------------------- | ------ |
| `src/domain/auth/jwt.spec.ts`                       | JWT payload, expiration, malformed token                      | PASS   |
| `src/services/auth/DevelopmentTokenStorage.spec.ts` | campus isolation and removal                                  | PASS   |
| `src/services/auth/AuthApiService.spec.ts`          | JWT login, 401 mapping, `/api/me`, invalid response           | PASS   |
| `src/services/auth/AuthenticatedHttpClient.spec.ts` | Bearer injection and missing-session failure                  | PASS   |
| `src/stores/auth.spec.ts`                           | sign-in, invalid credentials, logout, expiration              | PASS   |
| `src/router/authGuards.spec.ts`                     | campus/auth redirects and session restoration                 | PASS   |
| `src/components/auth/LoginForm.spec.ts`             | accessible validation, credential emission, password clearing | PASS   |

### Pending local browser evidence

- Invalid credentials show the specific error and remain on login.
- Valid credentials open Courses and display the authenticated full name.
- Profile displays the `/api/me` fields.
- Direct navigation to `/profile` without a session redirects to login.
- Logout removes the session and protects `/courses` and `/profile`.
- Reload clears the in-memory development token and redirects to login.
- Browser storage contains campus profiles only; no password or JWT.
- Browser console and network logs do not expose credentials or bearer tokens beyond the standard protected request header inspector.

---

## Chat 04 — Courses and sessions candidate

### Runtime API contracts

| Date       | Role                     | Method/path                                          | Expected                     | Actual        |
| ---------- | ------------------------ | ---------------------------------------------------- | ---------------------------- | ------------- |
| 2026-07-17 | Authenticated local user | `GET /api/me/courses`                                | Hydra direct memberships     | HTTP 200 PASS |
| 2026-07-17 | Anonymous                | `GET /api/me/courses`                                | Reject missing JWT           | HTTP 401 PASS |
| 2026-07-17 | Authenticated local user | `GET /api/users/{id}/session_subscriptions/past`     | Past sessions                | HTTP 200 PASS |
| 2026-07-17 | Authenticated local user | `GET /api/users/{id}/session_subscriptions/current`  | Current sessions and courses | HTTP 200 PASS |
| 2026-07-17 | Authenticated local user | `GET /api/users/{id}/session_subscriptions/upcoming` | Upcoming sessions            | HTTP 200 PASS |

### Isolated mobile candidate

| Command                                 | Result                                          |
| --------------------------------------- | ----------------------------------------------- |
| `prettier --check .`                    | PASS                                            |
| `eslint . --max-warnings=0`             | PASS                                            |
| `vue-tsc --noEmit -p tsconfig.app.json` | PASS                                            |
| `tsc --noEmit -p tsconfig.node.json`    | PASS                                            |
| `vitest run --maxWorkers=2`             | PASS — 24 files, 68 tests                       |
| `vite build`                            | PASS — Vite 8.1.4, 204 modules                  |
| dependency comparison                   | PASS — `package.json` and `yarn.lock` unchanged |
| native directory check                  | PASS — no `android/` or `ios/`                  |

### Added coverage

- direct membership and session-context normalization;
- Hydra pagination and unsafe-next-link rejection;
- campus-and-user cache isolation;
- offline cached data and network fallback;
- direct membership route identity;
- requirements-locked course card;
- asset URL protocol and credential validation.

### Pending local browser evidence

- Direct courses match the selected authenticated user.
- Current session courses display under the correct session.
- Course navigation carries direct membership or session query context.
- Offline mode shows cached course data and retry state.
- Logout removes `campusId/cache/*` entries and in-memory overview.
- Mobile viewport has no horizontal overflow.

---

## Chat 05 — Mobile course home candidate

### Static and build validation

| Command                                    | Result                                          |
| ------------------------------------------ | ----------------------------------------------- |
| `prettier --write/check .`                 | PASS                                            |
| `eslint . --max-warnings=0`                | PASS                                            |
| `vue-tsc --noEmit -p tsconfig.app.json`    | PASS                                            |
| `tsc --noEmit -p tsconfig.node.json`       | PASS                                            |
| `vitest run --pool=vmForks --maxWorkers=2` | PASS — 28 files, 80 tests                       |
| `vite build`                               | PASS — Vite 8.1.4, 212 modules                  |
| dependency comparison                      | PASS — `package.json` and `yarn.lock` unchanged |
| native directory check                     | PASS — no `android/` or `ios/`                  |

### Added coverage

- strict parsing of direct and session route context;
- rejection of mixed or incomplete enrollment identifiers;
- exact direct membership and session-course resolution;
- denied and unavailable direct-course states;
- explicit announcement capability and preserved route context;
- course header rendering for session/progress context;
- tool card read-only labeling;
- announcement route context preservation.

### Pending local browser evidence

- Direct course header matches the selected membership.
- Session course header shows the correct session.
- Back navigation returns to Courses.
- Only Announcements appears in the tool list.
- Announcements placeholder keeps `source`, `sid`, `membership` or `sessionCourse` query context.
- Invalid copied URLs show the missing-context state rather than another course.
- Mobile viewport has no horizontal overflow.

---

## Chat 06 — Read-only announcements candidate

### Generation-environment checks

| Check                                                               | Result                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TypeScript/Vue script syntax transpilation                          | PASS                                                                                                  |
| Strict core TypeScript check for announcement domain, API and cache | PASS                                                                                                  |
| Dependency manifest comparison                                      | Pending local script; no files intentionally changed                                                  |
| Full Yarn install/lint/test/build                                   | Pending local environment because package-manager downloads are unavailable in the generation sandbox |

### Added coverage in the ZIP

- announcement list/detail contract normalization;
- response course/session mismatch rejection;
- unsafe attachment URL rejection;
- read-only `isStudentView=true` query;
- 403 mapping;
- HTML script/handler/protocol removal;
- safe link attributes and same-campus image restriction;
- campus/user/context cache isolation;
- offline cached list behavior;
- detail cache behavior;
- announcement card rendering;
- detail route context preservation.

### Required local technical evidence

```text
yarn install --immutable
yarn format:check
yarn lint
yarn typecheck
yarn test:unit
yarn build
```

### Required runtime API evidence

Use `scripts/test-announcements-api.sh` and record:

- valid JWT login HTTP 200;
- announcement list HTTP 200;
- returned `courseId` and optional `sessionId` match the requested context;
- `studentView=true`, `canManage=false`, empty CSRF token;
- detail HTTP 200 when at least one visible announcement exists;
- no-token list HTTP 401.

### Required browser evidence

- direct course list and detail;
- session course list and detail;
- empty state;
- invalid/mixed route context state;
- sanitized links open safely;
- scripts/event handlers do not execute;
- offline cached list/detail and retry;
- attachment metadata shown without a direct unauthenticated link;
- mobile viewport without horizontal page overflow.

---

## Chat 06 — Runtime closure

| Check                      | Result                                           |
| -------------------------- | ------------------------------------------------ |
| JWT authentication         | PASS — HTTP 200                                  |
| Announcement list          | PASS — HTTP 200, read-only contract              |
| Announcement detail        | PASS — HTTP 200, read-only contract              |
| Anonymous access rejection | PASS — HTTP 403; mobile handles HTTP 401 and 403 |
| Commit                     | PASS — base for Chat 07 is `f3defd1`             |

---

## Chat 07 — Android platform and native transport

| Check                               | Result                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Branch/base                         | PASS — `feature/mobile2-android`, base `f3defd1`                          |
| Formatting                          | PASS                                                                      |
| ESLint                              | PASS                                                                      |
| TypeScript                          | PASS                                                                      |
| Unit tests                          | PASS — 35 files, 103 tests                                                |
| Vite production build               | PASS — 234 modules                                                        |
| Capacitor Android generation        | PASS                                                                      |
| Capacitor sync                      | PASS — `@capacitor/app@8.1.0` detected                                    |
| Native HTTP unit coverage           | PASS — relative URL, errors, redirect rejection                           |
| Android back-button unit coverage   | PASS                                                                      |
| ADB                                 | PASS — platform-tools 37.0.0                                              |
| Android SDK                         | PASS — Platform 36 and Build Tools 35 installed                           |
| Gradle debug build                  | PASS — 123 actionable tasks                                               |
| APK                                 | PASS — 4.6 MB debug APK                                                   |
| APK SHA-256                         | PASS — `0f202bbdfea114d02cde51d4605bab87a85cc4a28eb900c747cc346bdc37ab8e` |
| Physical device detection           | PASS — LG K42 recognized as `device`                                      |
| Physical installation               | PASS — user confirmed APK installed                                       |
| Cleartext override scan             | PASS — absent                                                             |
| Certificate bypass scan             | PASS — absent                                                             |
| Local/signing files tracked         | PASS — absent                                                             |
| Commercial/community plugin scan    | PASS — absent                                                             |
| JavaScript license inventory        | PASS — 480 packages, 0 blocked/unknown metadata in captured install       |
| Public HTTPS campus end-to-end flow | Deferred until a reachable test campus is available                       |

### Non-blocking Android warnings

- Capacitor-generated Gradle files use a `flatDir` repository for Cordova compatibility.
- The local command-line tools emitted an SDK XML generation warning during initial setup.
- Upstream Capacitor Android sources emitted unchecked-operation compiler notes.

None prevented `assembleDebug` from succeeding.
