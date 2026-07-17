# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-17 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Completed branch: feature/mobile2-course-home
Expected completed commit: Mobile: Add mobile course home
Target branch: feature/mobile2-announcements
Working tree before apply: clean
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: feature/mobile-api-current-user
HEAD: ba1f018207 API: Add authenticated user profile operation
Working tree: clean
Backend changes required by Chat 06: none
```

## Current phase

```text
Chat: 06
Batch: Read-only announcements list and detail
Status: Candidate prepared; pending local Yarn validation, runtime API evidence, browser verification and commit
```

## Done

- [x] Scaffold, campus profiles, transport, JWT authentication and current-user profile.
- [x] Direct courses and session courses with context-preserving navigation.
- [x] Mobile-owned course home and explicit ToolCapability registry.
- [x] Announcement list and detail clients use only verified REST operations.
- [x] Read-only student view is forced through `isStudentView=true`.
- [x] Course and session IDs are checked against every list/detail response.
- [x] Announcement list, detail, author, dates and attachment metadata normalized into TypeScript models.
- [x] HTML sanitizer removes executable/embedded content, inline handlers and unsafe URL protocols.
- [x] Safe links receive `_blank`, `noopener`, `noreferrer` and `nofollow`.
- [x] Images are restricted to the selected campus origin.
- [x] Loading, error, empty, retry, stale/offline list and stale/offline detail states implemented.
- [x] Announcement cache isolated by campus, user and exact course/session enrollment context.
- [x] Logout/session cleanup clears persistent announcement cache through the existing campus cache namespace and resets the Pinia store.
- [x] Attachment metadata shown; authenticated file download intentionally deferred.
- [x] No dependencies, backend files or native projects added.

## Pending locally

- [ ] Apply Chat 06 ZIP from a clean committed `feature/mobile2-course-home` branch.
- [ ] Run Yarn 4 immutable install, format, lint, TypeScript, tests and build.
- [ ] Run the included runtime announcement contract script against a representative course.
- [ ] Verify direct-course and session-course lists show only visible announcements.
- [ ] Verify announcement detail renders sanitized content and safe links.
- [ ] Verify empty, invalid context, access denied and offline cached states.
- [ ] Verify attachment metadata does not expose unauthenticated download links.
- [ ] Commit the batch.

## Confirmed API contracts

| Feature             | Method | Path                                                   | Status                      |
| ------------------- | ------ | ------------------------------------------------------ | --------------------------- |
| JWT login           | POST   | `/api/authentication_token`                            | Runtime PASS                |
| Current user        | GET    | `/api/me`                                              | Runtime PASS                |
| Direct courses      | GET    | `/api/me/courses`                                      | Runtime PASS                |
| Sessions            | GET    | `/api/users/{id}/session_subscriptions/{period}`       | Runtime PASS                |
| Announcement list   | GET    | `/api/announcement/list?cid={cid}&sid={sid}&gid={gid}` | Static/provider verified    |
| Announcement detail | GET    | `/api/announcement/{id}?cid={cid}&sid={sid}&gid={gid}` | Static/provider verified    |
| Attachment download | GET    | `/api/announcement/{id}/attachment/{id}/download`      | Contract found; UI deferred |

## Accepted ADRs

- ADR-001 independent client.
- ADR-003 REST first.
- ADR-019 browser/native transport boundary.
- ADR-024 JWT authentication bootstrap.
- ADR-025 token storage lifecycle.
- ADR-026 compose course memberships in the mobile client.
- ADR-027 mobile-owned course home and explicit capabilities.
- ADR-028 read-only announcements, student-view contract and sanitization boundary.

## Next batch

```text
Chat 07 — Capacitor Android platform and verified native transport boundary.
```

## Do not redo

- Do not recreate scaffold, campus, transport, authentication, courses, course home or ToolCapability registry.
- Do not add announcement create/edit/delete, recipients or visibility controls.
- Do not render server HTML without `sanitizeAnnouncementHtml`.
- Do not open attachment URLs directly without an authenticated binary/file-handling design.
- Do not add GraphQL.
- Do not modify `chamilo-lms` for announcements unless runtime evidence proves a new gap.
- Do not generate iOS.
