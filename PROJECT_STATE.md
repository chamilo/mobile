# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-16 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Completed branch: feature/mobile2-campus-transport
Completed Chat 01 commit: 050588c Mobile: Add Vue and Capacitor scaffold
Chat 02 commit: completed locally before the backend GAP-001 context was generated; hash must be captured from the local repository
Target branch for this batch: feature/mobile2-auth
Expected working tree before apply: clean
Remote: origin
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: feature/mobile-api-current-user
Commit: ba1f018207 API: Add authenticated user profile operation
Working tree: clean
Runtime contract verification: PASS
```

## Current phase

```text
Chat: 03
Batch: JWT authentication and authenticated profile bootstrap
Status: Candidate validated; pending local application, browser verification and commit
```

## Done

- [x] Chat 00 discovery and runtime JWT/CORS verification.
- [x] Chat 01 Vue/TypeScript scaffold committed.
- [x] Chat 02 campus profiles and browser transport committed locally.
- [x] GAP-001 backend operation `GET /api/me` implemented and committed as `ba1f018207`.
- [x] `POST /api/authentication_token` runtime contract verified.
- [x] `GET /api/me` runtime contract verified with valid, missing and invalid JWT cases.
- [x] Login form with stable input names and accessible errors.
- [x] Typed JWT parsing and expiration handling.
- [x] `TokenStorage` boundary with browser development memory storage.
- [x] Explicit unsupported secure-native storage pending the security batch.
- [x] Auth API service for token creation and current-user loading.
- [x] Token isolated by campus namespace.
- [x] Authenticated HTTP decorator for later protected API services.
- [x] Pinia auth state, profile bootstrap and logout cleanup.
- [x] Router guards for campus and authentication requirements.
- [x] Authenticated profile screen.
- [x] 17 test files and 47 tests PASS in the isolated candidate.
- [x] ESLint, TypeScript and Vite production build PASS.
- [x] No dependency or lockfile changes.

## Pending locally

- [ ] Create `feature/mobile2-auth` from the clean committed campus/transport branch.
- [ ] Apply the Chat 03 ZIP.
- [ ] Run Yarn 4 immutable install and all quality gates.
- [ ] Sign in through the mobile UI against `https://chamilo2.local`.
- [ ] Verify invalid credentials, valid credentials, profile bootstrap and logout.
- [ ] Verify route guards and page reload behavior.
- [ ] Confirm no password or JWT appears in browser storage or console logs.
- [ ] Commit the mobile auth batch.

## Confirmed API contracts

| Feature               | Method | Path                                                            | Status                                                         |
| --------------------- | ------ | --------------------------------------------------------------- | -------------------------------------------------------------- |
| JWT login             | POST   | `/api/authentication_token`                                     | Runtime PASS                                                   |
| Current user          | GET    | `/api/me`                                                       | Backend commit `ba1f018207`; runtime PASS                      |
| Direct courses        | GET    | `/api/me/courses`                                               | Static verified; runtime authenticated payload pending Chat 04 |
| Session subscriptions | GET    | `/api/users/{id}/session_subscriptions/{past,current,upcoming}` | Static verified; runtime payload pending Chat 04               |

## Accepted ADRs relevant to this batch

- ADR-019 browser/native transport boundary.
- ADR-020 exact dependency baseline.
- ADR-021 campus profile persistence boundary.
- ADR-022 campus URL security policy.
- ADR-023 browser transport implementation.
- ADR-024 JWT authentication bootstrap.
- ADR-025 token storage and lifecycle boundary.

## Next batch

```text
Chat 04 — audit and implement My courses and sessions using the authenticated profile ID and existing verified operations. Measure the existing multi-call contract before authorizing GAP-002 backend work.
```

## Do not redo

- Do not recreate the scaffold, campus profiles or HTTP transport.
- Do not reimplement `/api/me` in the mobile repository.
- Do not store passwords.
- Do not persist JWTs in browser localStorage/sessionStorage.
- Do not add refresh tokens.
- Do not implement LDAP/OAuth/SSO mobile flows in the MVP.
- Do not start courses, sessions or announcements in this batch.
- Do not generate `android/` or `ios/`.
