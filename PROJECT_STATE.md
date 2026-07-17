# PROJECT_STATE

## Project

Chamilo Mobile 2.x

## Updated

2026-07-16 19:05 America/Lima

## Mobile repository

```text
Path: /var/www/chamilo-mobile
Target branch: feature/mobile2-scaffold
Base HEAD: 3b06a5e3d0c712e8bcb52f2ff10485da57553ca7
Expected working tree after applying ZIP: scaffold files added/updated, pending local verification and commit
Remote: origin
```

## Backend repository

```text
Path: /var/www/chamilo2
Branch: master
HEAD: 984b7fc7fcd8c382b61a6399904b373787b83aa8
Working tree at Chat 00 close: clean
Backend changes in this batch: none
```

## Current phase

```text
Chat: 01
Batch: Vue/TypeScript scaffold and standards
Status: Ready for local application and verification
```

## Done in the generated candidate

- [x] Vue 3 + Vite + TypeScript scaffold.
- [x] Vue Router with MVP placeholder routes.
- [x] Pinia bootstrap.
- [x] vue-i18n with English visible text.
- [x] Tailwind CSS mobile-first shell.
- [x] Selective PrimeVue integration and PrimeIcons.
- [x] Capacitor core/CLI configuration without Android or iOS projects.
- [x] ESLint and Prettier configuration.
- [x] Vitest + Vue Test Utils smoke tests.
- [x] Mobile app header and bottom navigation with 44px+ targets.
- [x] Immutable Yarn 4.17.1 lockfile.
- [x] Isolated validation: install, format, lint, typecheck, 4 tests, build and Capacitor version PASS.

## Pending locally

- [ ] Apply ZIP on `feature/mobile2-scaffold`.
- [ ] Run the immutable install and complete validation commands on `/var/www/chamilo-mobile`.
- [ ] Open `http://localhost:5173` in a 390x844 mobile viewport and confirm layout/navigation.
- [ ] Commit only after all local checks pass.

## Out of scope for Chat 01

- Campus persistence or compatibility checks.
- Browser/native HTTP adapters.
- JWT login or token storage.
- Current-user backend gap implementation.
- Courses, sessions, course home or announcements.
- Android or iOS platform generation.
- Backend source changes.

## Confirmed API contracts

| Feature              | Method | Path                        | Status                                        |
| -------------------- | ------ | --------------------------- | --------------------------------------------- |
| JWT login            | POST   | `/api/authentication_token` | Runtime verified in Chat 00                   |
| Direct courses       | GET    | `/api/me/courses`           | Static verified; unauthenticated 401 verified |
| Current user/profile | —      | —                           | GAP-001 confirmed                             |

## Accepted ADRs relevant to this batch

- TypeScript.
- Yarn `4.17.1` via Corepack.
- Node `>=22.12.0 <23`; `.nvmrc` uses `22.23.1`.
- REST/API Platform first.
- PrimeVue selective.
- Capacitor `8.4.1` configuration without native platforms.
- Vitest `4.1.10`; the earlier Vitest `5.x` proposal is superseded.
- Browser/native transport boundary remains deferred to Chat 02 implementation.

## Next batch

```text
Finish Chat 01 locally: apply the ZIP, run all quality gates, verify the mobile viewport and commit. Only after Chat 01 is marked Done, start Chat 02 for campus profiles and the HttpClient abstraction.
```

## Do not redo

- Do not re-audit Chat 00 contracts.
- Do not add authentication or API calls to the scaffold branch.
- Do not generate `android/` or `ios/`.
- Do not add a second package-manager lockfile.
- Do not disable Yarn supply-chain age protection.
