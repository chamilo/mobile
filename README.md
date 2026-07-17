# Chamilo Mobile 2.x

Independent mobile client for Chamilo LMS 2.1+.

The application is built with Vue 3, TypeScript, Vite and Capacitor. It consumes verified REST/API Platform contracts and does not load the remote Chamilo SPA or legacy pages through silent autologin.

## Current status

Chat 06 read-only announcements:

- Vue 3 mobile scaffold, campus profiles and browser HTTP transport;
- JWT login and authenticated profile through verified REST contracts;
- direct and session courses with preserved enrollment context;
- mobile-owned course home and explicit ToolCapability registry;
- announcement list and detail through the existing API Platform Providers;
- forced read-only student view with no management controls or CSRF tokens;
- course/session response-context verification;
- author, dates, content and attachment metadata;
- audited HTML sanitizer and safe external-link attributes;
- list/detail loading, error, empty, retry and offline cached states;
- announcement cache isolated by campus, authenticated user and course/session context;
- no backend announcement change because existing contracts are sufficient.

Not implemented yet:

- authenticated attachment file download;
- native HTTP or secure native token storage;
- Android or iOS projects;
- refresh tokens or external identity-provider flows;
- announcement create/edit/delete.

## Requirements

```text
Node >=22.12.0 <23
Yarn 4.17.1 through Corepack
```

Recommended local version:

```text
Node 22.23.1
```

## Install

```bash
corepack enable
corepack install --global yarn@4.17.1
yarn install --immutable
```

## Development

```bash
yarn dev
```

Open the URL printed by Vite. The default development origin is usually `http://localhost:5173`.

## Optional development proxy

Browser requests normally use the selected campus URL directly and therefore require an explicit CORS configuration on the campus.

For a single local campus, copy `.env.example` to `.env.local` and enable the proxy:

```dotenv
VITE_USE_DEV_PROXY=true
VITE_DEV_PROXY_TARGET=https://chamilo2.local
VITE_DEV_PROXY_INSECURE=true
```

The proxy is used only when the normalized selected campus URL matches `VITE_DEV_PROXY_TARGET`. It is a development convenience, not the multi-campus production transport.

## Quality checks

```bash
yarn format:check
yarn lint
yarn typecheck
yarn test:unit
yarn build
```

## Capacitor

Capacitor core and CLI are configured, but no native project is generated in this batch.

```bash
yarn cap --version
```

Do not run `cap add android` or `cap add ios` until the dedicated Android batch.

## Architecture boundaries

All future network calls pass through:

```text
HttpClient
├── BrowserHttpClient
└── NativeHttpClient
```

Views and stores must not import Axios, `fetch`, Capacitor HTTP, `localStorage` or native storage plugins directly.

Campus profile persistence also passes through `CampusProfileRepository`. The browser implementation uses `localStorage`, but components and Pinia stores do not access it directly.

Course data persistence passes through `CampusCacheRepository`. Announcement list/detail persistence uses the same campus cache namespace through `AnnouncementsCacheRepository`. Cache keys include campus ID, authenticated user ID and exact course/session context, and all cached data is removed on logout.

## Security baseline

- HTTPS is required outside explicit local development.
- HTTP is accepted only for localhost, `.local` and private network hosts when the user opts in.
- Campus URLs reject embedded credentials, query strings and fragments.
- Request paths cannot replace the selected campus host.
- Cross-host redirects are rejected when the browser exposes the final response URL.
- Do not store passwords.
- Do not log JWTs.
- Keep future profile, token, cache and settings data namespaced by campus.
- Do not pass tokens in query strings.
- Do not open legacy tools with silent autologin.

## Authentication status

The mobile app uses the verified Chamilo contracts:

```text
POST /api/authentication_token
GET /api/me
```

The browser development build keeps JWTs in memory only. Passwords are never stored. Reloading the page clears the development session by design. Native secure storage remains intentionally unavailable until its dedicated security batch.

## Mobile course home

The course home is owned by this application. It resolves the exact direct membership or session-course identity carried from the course list and never loads the LMS web homepage or legacy shortcuts.

Tools are exposed through an explicit `ToolCapability` registry. A tool appears only after its API contract and permission behavior are verified. The first registered capability is read-only Announcements. List and detail are implemented through verified REST operations, and server HTML is rendered only after the local sanitizer boundary.
