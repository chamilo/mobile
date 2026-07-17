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
