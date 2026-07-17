# Chamilo Mobile 2.x

Independent mobile client for Chamilo LMS 2.1+.

The application is built with Vue 3, TypeScript, Vite and Capacitor. It consumes verified REST/API Platform contracts and does not load the remote Chamilo SPA or legacy pages through silent autologin.

## Current status

Chat 02 campus and transport foundation:

- Vue 3 mobile scaffold;
- add, edit, select and remove campus profiles;
- safe URL normalization with HTTPS by default;
- explicit local-development HTTP opt-in;
- browser persistence behind `CampusProfileRepository`;
- campus namespace helper (`campusId/token`, `campusId/profile`, `campusId/cache`, `campusId/settings`);
- Pinia campus and connectivity stores;
- browser offline banner;
- transport-neutral `HttpClient` contract;
- Axios-based `BrowserHttpClient` behind the transport interface;
- explicit `NativeHttpClient` boundary pending the Android batch;
- timeout, cancellation, normalized errors and cross-host redirect protection;
- optional single-campus Vite development proxy;
- unit and component tests.

Not implemented yet:

- campus compatibility network probe;
- JWT login or token storage;
- authenticated current user;
- courses and sessions;
- course home capabilities;
- announcements;
- Android or iOS projects.

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
