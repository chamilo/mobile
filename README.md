# Chamilo Mobile 2.x

Independent mobile client for Chamilo LMS 2.1+.

The application is built with Vue 3, TypeScript, Vite and Capacitor. It consumes verified REST/API Platform contracts and does not load the remote Chamilo SPA or legacy pages through silent autologin.

## Current status

Chat 01 scaffold:

- Vue 3 with Composition API and `<script setup>`;
- TypeScript;
- Vite;
- Vue Router;
- Pinia;
- vue-i18n;
- Tailwind CSS;
- selective PrimeVue integration in unstyled mode;
- Capacitor core/CLI configuration without native platforms;
- ESLint and Prettier;
- Vitest and Vue Test Utils smoke tests;
- mobile shell and placeholder routes.

Not implemented yet:

- campus profiles;
- HTTP transport adapters;
- JWT login;
- current user profile;
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

## Architecture boundary

Future network calls must pass through the project transport abstraction:

```text
HttpClient
├── BrowserHttpClient
└── NativeHttpClient
```

Views and stores must not import Axios, `fetch`, Capacitor HTTP, `localStorage` or native storage plugins directly.

## Security baseline

- Do not store passwords.
- Do not log JWTs.
- Keep data namespaced by campus.
- Use HTTPS outside explicit local development.
- Do not pass tokens in query strings.
- Do not open legacy tools with silent autologin.
