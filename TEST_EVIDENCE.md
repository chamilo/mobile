# TEST_EVIDENCE

Runtime context confirmed:

- direct list/form: HTTP 200;
- session list/form: HTTP 200;
- `canWrite=true` exposes CSRF;
- student view is read-only and omits CSRF;
- anonymous list: HTTP 403.

The apply script runs formatting, ESLint, TypeScript, unit tests, production build and Capacitor Android sync in the user's repository.
