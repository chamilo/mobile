# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-17 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Branch: feature/mobile2-courses
Base HEAD: 9d9a10e Mobile: Add JWT authentication flow
Working tree before apply: clean
Previous commits:
- 9161132 Mobile: Add campus profiles and HTTP transport
- 050588c Mobile: Add Vue and Capacitor scaffold
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: feature/mobile-api-current-user
HEAD: ba1f018207 API: Add authenticated user profile operation
Working tree: clean
Backend changes required by Chat 04: none
```

## Current phase

```text
Chat: 04
Batch: Real courses and sessions
Status: Candidate validated; pending local apply, browser verification and commit
```

## Done

- [x] Scaffold, campus profiles, transport and JWT authentication.
- [x] Current-user backend contract `GET /api/me`.
- [x] Runtime `GET /api/me/courses` HTTP 200 with JWT and HTTP 401 without JWT.
- [x] Runtime past/current/upcoming session-subscription contracts HTTP 200.
- [x] Existing LMS Vue `courseService`, `sessionService`, Hydra handling and session cards audited.
- [x] Existing operations classified as sufficient for the MVP; GAP-002 closed without backend code.
- [x] Typed direct-course and session-course normalization.
- [x] Hydra pagination with same-campus relative-link validation.
- [x] Mobile course/session cards and context-preserving navigation.
- [x] Loading, error, empty, retry and stale/offline cache states.
- [x] Cache isolated by campus and authenticated user.
- [x] Logout/session expiration cache cleanup.
- [x] 24 test files and 68 tests PASS in the isolated candidate.
- [x] Prettier, ESLint, TypeScript and Vite build PASS.
- [x] No dependency or lockfile changes.

## Pending locally

- [ ] Apply Chat 04 ZIP on `feature/mobile2-courses` at base `9d9a10e`.
- [ ] Run Yarn 4 immutable install and quality gates.
- [ ] Sign in against `https://chamilo2.local` and verify direct/session lists.
- [ ] Verify course navigation preserves direct membership or session context.
- [ ] Verify offline cached data and retry.
- [ ] Verify logout clears cached course data.
- [ ] Commit the batch.

## Confirmed API contracts

| Feature           | Method | Path                                             | Runtime                       |
| ----------------- | ------ | ------------------------------------------------ | ----------------------------- |
| JWT login         | POST   | `/api/authentication_token`                      | PASS                          |
| Current user      | GET    | `/api/me`                                        | PASS                          |
| Direct courses    | GET    | `/api/me/courses`                                | 200 with JWT; 401 without JWT |
| Past sessions     | GET    | `/api/users/{id}/session_subscriptions/past`     | 200                           |
| Current sessions  | GET    | `/api/users/{id}/session_subscriptions/current`  | 200                           |
| Upcoming sessions | GET    | `/api/users/{id}/session_subscriptions/upcoming` | 200                           |

## Accepted ADRs

- ADR-001 independent client.
- ADR-003 REST first.
- ADR-019 browser/native transport boundary.
- ADR-024 JWT authentication bootstrap.
- ADR-025 token storage lifecycle.
- ADR-026 compose course memberships in the mobile client.

## Next batch

```text
Chat 05 — mobile course home and explicit tool capability registry. Use preserved course/session context; do not open legacy pages.
```

## Do not redo

- Do not recreate scaffold, campus, transport, authentication or course list.
- Do not add a composed courses backend endpoint without new evidence.
- Do not merge direct and session enrollments by course ID.
- Do not persist JWTs in browser storage.
- Do not start announcements in Chat 05.
- Do not generate Android or iOS projects yet.
