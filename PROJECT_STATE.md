# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-17 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Completed branch: feature/mobile2-courses
Expected completed commit: Mobile: Show user courses and sessions
Target branch: feature/mobile2-course-home
Working tree before apply: clean
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: feature/mobile-api-current-user
HEAD: ba1f018207 API: Add authenticated user profile operation
Working tree: clean
Backend changes required by Chat 05: none
```

## Current phase

```text
Chat: 05
Batch: Mobile course home and ToolCapability registry
Status: Candidate validated; pending local apply, browser verification and commit
```

## Done

- [x] Scaffold, campus profiles, transport, JWT authentication and current-user profile.
- [x] Direct courses and session courses with Hydra pagination and campus/user cache isolation.
- [x] Direct membership and session-course navigation context preserved.
- [x] LMS `courseService.loadTools()` and `/course/{cid}/home.json` audited.
- [x] Web-coupled course-home JSON rejected as the mobile capability source because it mutates web session state and includes legacy shortcuts.
- [x] Explicit `ToolCapability` contract implemented.
- [x] Announcements registered as the only currently verified read-only course capability.
- [x] Course header with direct/session context, role and progress.
- [x] Loading, retry, missing-context, denied and unavailable states.
- [x] Announcement placeholder route preserves course/session enrollment identity for Chat 06.
- [x] Prettier, ESLint, TypeScript and Vite build PASS.
- [x] 28 test files and 80 tests PASS.
- [x] No dependency or lockfile changes.
- [x] No backend, Android or iOS changes.

## Pending locally

- [ ] Apply Chat 05 ZIP from the committed Chat 04 branch.
- [ ] Run Yarn 4 immutable install and all quality gates.
- [ ] Open direct and session courses from the real course list.
- [ ] Verify header, back navigation and context preservation.
- [ ] Verify only Announcements appears as a tool.
- [ ] Verify invalid/mixed route context returns to courses safely.
- [ ] Verify blocked direct enrollment state when representative data exists.
- [ ] Commit the batch.

## Confirmed API contracts

| Feature             | Method | Path                                                   | Status               |
| ------------------- | ------ | ------------------------------------------------------ | -------------------- |
| JWT login           | POST   | `/api/authentication_token`                            | Runtime PASS         |
| Current user        | GET    | `/api/me`                                              | Runtime PASS         |
| Direct courses      | GET    | `/api/me/courses`                                      | Runtime PASS         |
| Sessions            | GET    | `/api/users/{id}/session_subscriptions/{period}`       | Runtime PASS         |
| Announcement list   | GET    | `/api/announcement/list?cid={cid}&sid={sid}&gid={gid}` | Verified for Chat 06 |
| Announcement detail | GET    | `/api/announcement/{id}?cid={cid}&sid={sid}&gid={gid}` | Verified for Chat 06 |

## Accepted ADRs

- ADR-001 independent client.
- ADR-003 REST first.
- ADR-019 browser/native transport boundary.
- ADR-024 JWT authentication bootstrap.
- ADR-025 token storage lifecycle.
- ADR-026 compose course memberships in the mobile client.
- ADR-027 mobile-owned course home and explicit capabilities.

## Next batch

```text
Chat 06 — read-only announcements list and detail using the preserved course/session context.
```

## Do not redo

- Do not recreate scaffold, campus, transport, authentication, courses or course home.
- Do not consume `/course/{cid}/home.json` as the mobile tool registry.
- Do not expose legacy shortcuts, remote SPA routes or silent autologin.
- Do not display unverified tools.
- Do not add announcement writes in Chat 06.
- Do not generate Android or iOS projects yet.
