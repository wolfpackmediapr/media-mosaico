# E2E responsive suite

- `public-responsive.spec.ts` runs without credentials.
- `auth.setup.ts` performs a **real** login against `/auth` using `E2E_EMAIL` /
  `E2E_PASSWORD` from the environment and writes `e2e/.auth/user.json`
  (git-ignored). No credentials are committed, no auth bypass, no RLS or
  Supabase auth changes.
- `responsive.spec.ts` reuses that storage state for protected routes.

Without `E2E_EMAIL` / `E2E_PASSWORD` the authenticated projects report
**BLOCKED - authenticated test credentials unavailable**, not PASS.
