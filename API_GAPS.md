# API_GAPS

## Summary

| ID      | Screen                          | Need                                                        | Existing contract                                                                              | Gap                                                                       | Security                                                               | Backend branch                    | Status                                    |
| ------- | ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| GAP-001 | Profile/auth bootstrap          | Minimal current authenticated user under Bearer JWT         | `GET /api/users/{id}`, server-injected `window.user`, `/check-session`                         | Client has no trusted ID and no minimal self-profile operation            | Return only authenticated user's permitted fields; AccessUrl-aware     | `feature/mobile-api-current-user` | Confirmed; not implemented                |
| GAP-002 | Courses/sessions                | One mobile list preserving enrollment and session identity  | `/api/me/courses` plus three session-subscription collections                                  | Not proven; existing operations may be sufficient after GAP-001           | Never trust arbitrary user ID; preserve AccessUrl and self-only checks | None until measured               | Investigation                             |
| GAP-003 | Campus compatibility            | Verify server compatibility before storing/using campus     | API docs/entrypoint may exist depending environment                                            | No dedicated compatibility operation found; existing metadata may suffice | Public response must disclose minimal version/capabilities only        | None until Chat 02 audit          | Investigation                             |
| GAP-004 | Authentication compatibility    | JWT login for LDAP/OAuth/SSO accounts                       | `/api/authentication_token` uses entity provider; external authenticators are on main firewall | Support not established                                                   | Avoid converting external login into insecure password flow            | None in MVP                       | Deferred                                  |
| GAP-005 | Announcements scale/attachments | Large lists and authenticated attachment downloads          | Read-only list/detail exist; list has no pagination                                            | Not proven as a gap without runtime volume/attachment tests               | Context and AccessUrl isolation must be tested                         | None until measured               | Investigation                             |
| GAP-006 | Login reliability               | JWT endpoint must not fail when IDS log exists but is empty | `/api/authentication_token`                                                                    | Empty IDS log triggers negative seek and HTTP 500                         | Never log password/JWT; preserve throttling and audit behavior         | Separate fix branch if authorized | Confirmed backend defect; workaround only |

## GAP-001 — JWT current user profile

- Mobile screen: authentication bootstrap and profile.
- User role: any authenticated MVP user.
- Course/session context: none.
- Existing endpoints tested: static audit only; no runtime curl included.
- Result:
  - no dedicated current-user operation found;
  - `GET /api/users/{id}` requires a client-supplied identifier;
  - the web SPA uses `window.user` and `/check-session`, which are not independent JWT contracts.
- Why existing contract is insufficient:
  - JWT claim names and user ID are not guaranteed;
  - a mobile client must not guess or trust a user ID;
  - the generic User entity can expose more fields than the MVP needs.
- Proposed minimum backend change:
  - add one self-profile API Platform read operation returning a minimal DTO from `Security::getUser()`;
  - path/name remain a backend-PR design decision and are not an existing contract.
- Entity/ApiResource: prefer a dedicated DTO ApiResource rather than broadening User serialization.
- Provider/Processor: Provider only.
- Authorization:
  - authenticated user required;
  - return only the current user;
  - apply current AccessUrl rules;
  - no arbitrary user ID input.
- Minimum response fields to justify in the backend PR:
  - stable user identifier;
  - username/display name;
  - roles needed by mobile navigation;
  - locale and avatar URL only if already safe and necessary.
- Test plan:
  - 401 without token;
  - 200 for active student and teacher;
  - no sensitive fields;
  - correct AccessUrl behavior;
  - disabled user behavior;
  - response under Bearer JWT only.
- Out of scope:
  - profile editing;
  - password change;
  - admin user lookup;
  - refresh token;
  - external identity-provider redesign.

## GAP-002 — Direct courses and session memberships composition

- Mobile screen: My courses.
- User role: student first; teacher later.
- Course/session context: direct course and course inside session must remain distinguishable.
- Existing endpoints tested: source audit of `/api/me/courses` and past/current/upcoming session subscriptions.
- Result:
  - direct subscriptions and session subscriptions are separate valid contracts;
  - session operations require current user ID;
  - runtime payload shape and total request cost are not captured.
- Why existing contract may be insufficient:
  - multiple calls and normalization may be needed;
  - duplicate courses can exist across direct/session contexts;
  - pagination differs between operations.
- Decision:
  - do not create a backend endpoint yet;
  - first implement/verify GAP-001, collect curl payloads and measure calls/payload size.
- Proposed minimum backend change if later proven:
  - a read-only DTO/Provider preserving membership identity, `courseId`, nullable `sessionId`, role/access and presentation fields.
- Authorization:
  - derive current user from security context;
  - enforce AccessUrl;
  - preserve course/session membership checks.
- Status: investigation, not approved.

## GAP-003 — Server compatibility signal

- Mobile screen: Add/select campus.
- User role: anonymous before login.
- Existing endpoints tested: static API Platform/OpenAPI configuration only.
- Result: API docs and entrypoint are configurable; no dedicated compatibility operation was found.
- Why existing contract may be insufficient: docs/entrypoint can be disabled and API version `1.0.0` may not represent mobile compatibility.
- Decision: Chat 02 must test whether an existing public and stable signal is sufficient before proposing backend code.
- Security: expose no installation secrets, paths, enabled plugins or private configuration.
- Status: investigation.

## GAP-004 — LDAP/OAuth/SSO to mobile JWT

- Mobile screen: Login.
- User role: external-directory or identity-provider user.
- Existing endpoints tested: static security firewall configuration.
- Result: `/api/authentication_token` uses the entity provider; LDAP/OAuth authenticators are configured under the main firewall.
- Why existing contract is insufficient: mobile JWT behavior for these accounts is not established.
- Decision: local username/password account is the initial MVP test path. External identity providers are deferred and must be designed explicitly.
- Security: do not collect external-provider passwords through an unverified flow; do not pass tokens in query strings.
- Status: deferred.

## GAP-005 — Announcement pagination and attachments

- Mobile screen: Announcements read-only.
- User role: student.
- Existing endpoints tested: static list/detail providers.
- Result: list/detail preserve course/session/group context; list returns all visible items; detail emits attachment download URLs.
- Why existing contract may be insufficient: large lists and native authenticated downloads are not measured.
- Decision: no backend change before runtime testing with a representative course.
- Security: verify cross-portal IDs, Bearer authorization, file ownership and safe filenames/content type.
- Status: investigation.

---

## GAP-006 — JWT login failure when IDS log is empty

- Mobile screen: Login.
- User role: any local username/password account.
- Course/session context: none.
- Existing endpoint tested: `POST /api/authentication_token`.
- Runtime result:
  - valid credentials initially returned HTTP 500;
  - backend log showed `SplFileObject::seek(): Argument #1 ($line) must be greater than or equal to 0` in `LoginAttemptLoggerHelper.php`;
  - `var/log/ids/ids.log` existed with zero bytes;
  - moving only that empty file aside removed the HTTP 500;
  - the same endpoint then returned HTTP 200 with a JWT for valid credentials.
- Why existing behavior is insufficient: a harmless empty log file must not break authentication.
- Proposed minimum backend change: guard the last-line lookup when the file is empty or contains no readable lines; preserve existing logging behavior otherwise.
- Authorization: unchanged.
- Test plan:
  - missing IDS log;
  - empty IDS log;
  - one valid line;
  - malformed final line;
  - valid login returns 200;
  - invalid login returns 401;
  - no credentials or JWT written to logs.
- Backend branch: separate maintenance/fix branch if authorized; not part of the mobile scaffold.
- Status: Confirmed backend defect; local workaround applied; source fix not implemented.

---

## Runtime evidence update — 2026-07-16

- Repository HEADs and clean states were confirmed.
- Node 22.23.1, Corepack 0.34.6 and Yarn 4.17.1 passed.
- CORS preflight from `http://localhost:5173` passed with explicit allowed origin.
- JWT valid login passed with HTTP 200 and a `token` field.
- JWT invalid login passed with HTTP 401.
- `/api/me/courses` without a token returned HTTP 401.
- GAP-001 remains the only confirmed missing API contract required for profile/auth bootstrap.
- GAP-006 records a separate backend defect found during runtime verification; it does not block Chat 01.
- GAP-002, GAP-003 and GAP-005 remain investigations; no backend feature branch is authorized yet.

---

## Chat 02 gap handling update — 2026-07-16

- GAP-003 was not converted into backend work.
- Campus profiles store `compatibilityStatus: unknown` and do not claim server compatibility.
- Chat 02 performs no anonymous compatibility request and invents no endpoint.
- The selected campus URL can be stored and used by the transport boundary, but the compatibility signal remains an investigation for a later contract-validation step.
- GAP-001 remains required before completing the authenticated profile bootstrap.
- No `chamilo-lms` source files are changed by this batch.
