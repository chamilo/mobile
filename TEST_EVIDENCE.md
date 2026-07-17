# TEST_EVIDENCE

## Technical

| Date       | Repo/artifact              | Base commit | Command                    | Result                         |
| ---------- | -------------------------- | ----------- | -------------------------- | ------------------------------ |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn --version`           | PASS — `4.17.1`                |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn install --immutable` | PASS — no warnings             |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn format:check`        | PASS                           |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn lint`                | PASS — zero warnings           |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn typecheck`           | PASS                           |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn test:unit`           | PASS — 3 files, 4 tests        |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn build`               | PASS — Vite `8.1.4`            |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | `yarn cap --version`       | PASS — `8.4.1`                 |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | Native directory check     | PASS — no `android/` or `ios/` |
| 2026-07-16 | Chat 01 isolated candidate | `3b06a5e`   | Trailing whitespace scan   | PASS                           |

## Unit tests

| Test file                                 | Coverage                                       | Result |
| ----------------------------------------- | ---------------------------------------------- | ------ |
| `src/App.spec.ts`                         | Default route, app shell, bottom navigation    | PASS   |
| `src/components/layout/AppHeader.spec.ts` | Page title rendering                           | PASS   |
| `src/router/index.spec.ts`                | Root redirect and course ID route preservation | PASS   |

## Web UI

| Date          | Browser                   | Flow                                      | Expected                                                    | Actual  | Evidence                 |
| ------------- | ------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ------- | ------------------------ |
| 2026-07-16    | Headless build validation | Production asset generation               | Build succeeds                                              | PASS    | `reports/VALIDATION.txt` |
| Pending local | Chrome DevTools 390x844   | Courses placeholder and bottom navigation | Header/card/navigation readable without horizontal overflow | Pending | User local check         |

## Android

| Date       | Device/API     | Build             | Flow                          | Expected                | Actual |
| ---------- | -------------- | ----------------- | ----------------------------- | ----------------------- | ------ |
| 2026-07-16 | Not applicable | No native project | Confirm no platform generated | No `android/` or `ios/` | PASS   |

## Security

| Date       | Test                     | Expected                      | Actual                              |
| ---------- | ------------------------ | ----------------------------- | ----------------------------------- |
| 2026-07-16 | Password/token storage   | No credentials introduced     | PASS                                |
| 2026-07-16 | API calls in scaffold    | No network implementation     | PASS                                |
| 2026-07-16 | Native platforms         | None generated                | PASS                                |
| 2026-07-16 | Package manager          | One immutable Yarn lockfile   | PASS                                |
| 2026-07-16 | Newly published packages | Do not bypass Yarn quarantine | PASS; older stable patches selected |

## Pending before commit

- Run all commands in the actual `/var/www/chamilo-mobile` branch.
- Record `git diff --check`.
- Perform the Chrome mobile viewport check.
- Record the resulting commit hash after commit.
