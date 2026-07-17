# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-16 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Branch: feature/mobile2-campus-transport
HEAD before applying Chat 02: 050588c
Previous completed branch: feature/mobile2-scaffold
Previous completed commit: 050588c Mobile: Add Vue and Capacitor scaffold
Expected working tree after applying ZIP: Chat 02 files modified/added, pending local verification and commit
Remote: origin
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: master
HEAD: 984b7fc7fcd8c382b61a6399904b373787b83aa8
Working tree at last verification: clean
Backend changes in this batch: none
```

## Current phase

```text
Chat: 02
Batch: Campus profiles and HTTP transport
Status: Ready for local application and verification
```

## Done

- [x] Chat 00 discovery, runtime JWT and CORS verification.
- [x] Chat 01 Vue/TypeScript scaffold.
- [x] Chat 01 local commit `050588c` on `feature/mobile2-scaffold`.
- [x] Chat 02 candidate implements add/edit/select/remove campus profiles.
- [x] Campus URLs normalize to HTTPS by default and preserve subdirectory installations.
- [x] HTTP opt-in is restricted to explicit local development hosts.
- [x] Campus persistence is hidden behind `CampusProfileRepository`.
- [x] Campus namespace helper covers token/profile/cache/settings keys.
- [x] Pinia campus and connectivity stores.
- [x] Empty, storage-error/retry and offline UI states.
- [x] Typed `HttpClient` interface.
- [x] Axios-based `BrowserHttpClient` with timeout, cancellation and normalized errors.
- [x] Cross-host request/redirect protections.
- [x] Explicit unsupported `NativeHttpClient` pending Android audit.
- [x] Optional single-campus Vite development proxy.
- [x] Isolated lint, typecheck, 26 tests and production build PASS.

## Pending locally

- [ ] Apply the Chat 02 ZIP on `feature/mobile2-campus-transport` at HEAD `050588c`.
- [ ] Run `yarn install --immutable`, format, lint, typecheck, tests and build.
- [ ] Test add/edit/select/remove with `https://chamilo2.local`.
- [ ] Reload the page and verify the selected campus persists.
- [ ] Test offline banner through Chrome DevTools.
- [ ] Confirm no horizontal overflow at 390x844.
- [ ] Commit only after all local checks pass.

## Out of scope for Chat 02

- Calling `/api/authentication_token` from the UI.
- Password or JWT storage.
- Authenticated current-user operation.
- Courses, sessions, course home or announcements.
- Anonymous server compatibility endpoint.
- Capacitor native HTTP implementation.
- Android or iOS platform generation.
- Changes in `chamilo-lms`.

## Confirmed API contracts

| Feature              | Method | Path                        | Status                                        |
| -------------------- | ------ | --------------------------- | --------------------------------------------- |
| JWT login            | POST   | `/api/authentication_token` | Runtime verified in Chat 00                   |
| Direct courses       | GET    | `/api/me/courses`           | Static verified; unauthenticated 401 verified |
| Current user/profile | —      | —                           | GAP-001 confirmed                             |
| Campus compatibility | —      | —                           | GAP-003 remains investigation                 |

## Accepted ADRs relevant to this batch

- ADR-019 browser/native transport boundary.
- ADR-020 exact dependency baseline.
- ADR-021 campus profile persistence boundary.
- ADR-022 campus URL security policy.
- ADR-023 browser transport and native boundary implementation.

## Next batch

```text
Finish Chat 02 locally: apply the ZIP, run all gates, verify campus persistence and mobile states, then commit `Mobile: Add campus profiles and HTTP transport`. Do not start JWT UI work until Chat 02 is clean and committed.
```

## Do not redo

- Do not recreate or reconfigure the scaffold.
- Do not update dependency versions or regenerate `yarn.lock`.
- Do not import Axios, `fetch` or `localStorage` from views/stores.
- Do not add token persistence.
- Do not invent a campus compatibility endpoint.
- Do not generate `android/` or `ios/`.
