# CP5-C4A.3D0 — Legacy-Mode Deployment of `process-rss-feed` (plan only)

All findings below come from read-only checks run just now. Nothing was deployed, invoked, mutated or rolled back.

## Pre-flight verification results

### Source integrity — all match, zero drift

```text
_shared/clientMatcher.ts        777c41cf…f6673   MATCH
_shared/aiClientSchema.ts       0da95958…3f45e   MATCH
_shared/legacyAiNameAdapter.ts  3d5f55ea…eba0dc  MATCH
_shared/shadowMatcher.ts        94bcdea0…f3a6594 MATCH
process-rss-feed/index.ts       36b11440…19e0933 MATCH

HEAD commit = f8e3dc6e ("Implemented matcher modules & tests")   MATCH
working tree = clean (no uncommitted changes)
```

Portal-sender boundary re-hashed: all eight files match the approved values exactly (`content/types.ts`, `content/digital.ts`, `handler.ts`, `auth.ts`, `signing.ts`, `finalize.ts`, `clients.ts`, `index.ts`). No drift. `portal-sender` is not deployed in D0.

### Current production configuration

```text
CURRENT process-rss DEPLOYMENT CONFIG  no [functions.process-rss-feed] block in supabase/config.toml
                                       (only sync-typeform-responses and portal-sender are declared)
CURRENT verify_jwt                     platform default for Lovable-managed functions (false);
                                       not declared, therefore not changed by this deployment
CURRENT CRON/SCHEDULE                  pg_cron jobid 1, "process-rss-feed-every-30min",
                                       schedule "*/30 * * * *", active = true,
                                       pg_net HTTP POST to /functions/v1/process-rss-feed
APPROXIMATE CADENCE                    every 30 minutes, 48 natural runs/day
```

Deployment touches none of these: no `config.toml` edit, no cron edit, no `verify_jwt` change.

### Matcher-mode environment

```text
DIGITAL_CLIENT_MATCHER_MODE PRESENT = NO
```

Verified against the project secret inventory (names only, no values read): the 11 configured secrets are CloudConvert, Gemini TV, Lovable API key, four Portal keys, the two Portal sender flags, Qwen, and the two Typeform keys. `DIGITAL_CLIENT_MATCHER_MODE` is absent.

```text
D0 EXPECTED EFFECTIVE MODE = legacy
```

`parseMatcherMode(undefined)` returns `legacy`; in legacy mode `shouldComputeShadow` is false, the roster is never loaded, and the shadow block is never entered. Shadow code is unreachable in D0.

### Legacy-authority invariants (re-confirmed against the approved source)

```text
LEGACY AI PROMPT MODIFIED              NO
LEGACY AI CONTRACT MODIFIED            NO
LEGACY KEYWORD MATCHER MODIFIED        NO
LEGACY MERGE MODIFIED                  NO
LEGACY DB WRITE PAYLOAD MODIFIED       NO
LEGACY WRITE CONDITIONS MODIFIED       NO
```

## Rollback source

`f8e3dc6e` is a merge commit; its first parent carries the pre-C4A.3 file.

```text
CURRENT/PRE-C4A.3 COMMIT          7f064bb2  (first parent of f8e3dc6e)
PRE-C4A.3 process-rss SHA-256     9c7050883f37260c87e1ff8b5cbc992bceff83789fa4939374daab3a48c62ff2
APPROVED C4A.3 process-rss SHA-256 36b11440f9091bf6de2e76f22673a60cdc857cc84d129bac3ed534d319b0e933

ROLLBACK SOURCE IDENTIFIED = YES
```

### Rollback procedure (source-only, not executed now)

1. Restore the file content from `7f064bb2:supabase/functions/process-rss-feed/index.ts` into the working tree.
2. Verify SHA-256 equals `9c7050883f…62ff2` before any deploy.
3. Deploy exactly `function_names = ["process-rss-feed"]`.
4. Verify one natural cron run recovers.

Rollback explicitly does NOT: modify database rows, delete or replay ingested articles, touch cron, touch `verify_jwt`, touch secrets, touch any other Edge Function. The `_shared/*` matcher modules may remain on disk — the pre-C4A.3 `index.ts` does not import them, so they become dead code and require no removal.

## Proposed D0 operation

```text
FUNCTIONS TO DEPLOY:
  process-rss-feed          (its bundle naturally includes the four _shared modules it imports)

FUNCTIONS NOT TO DEPLOY:
  reanalyze-articles        (C4A.3 source stays undeployed)
  portal-sender
  process-social-feeds
  all others

MANUAL INVOCATION AFTER DEPLOY = NO
NATURAL CRON VALIDATION        = YES
SHADOW MODE ENABLED            = NO
ENVIRONMENT MUTATION           = NO
DB/SCHEMA/RLS MUTATION         = NO
PORTAL INTERACTION             = NO
```

## Natural scheduled-run validation

After deploy, wait for the next `*/30` cron firing (worst case ~30 minutes). Read logs only, and report:

- invocation timestamp and completion status
- boot/import success, module-resolution errors
- runtime error count
- feeds processed, articles inserted, duplicates/skips
- pre-existing AI errors or fallbacks, if normally reported
- `shadow diagnostics = 0` and `matcher shadow errors = 0` (required)

No article bodies, secrets, prompts or raw AI responses will be printed. If any `digital_client_matcher_shadow` line or `[shadow]` error appears, that is **D0 FAIL** and rollback is proposed for approval.

If the run inserts zero new articles, that is reported as "write behavior not observable in this run" — no manual invocation, no manufactured traffic, no rerun.

## Rollback triggers vs. known behavior

Propose rollback for: import/boot failure, new module-resolution error, new uncaught exception, cron invocation now failing, legacy insert failing due to instrumentation, or shadow executing in D0.

Do not roll back for: pre-existing upstream feed errors, pre-existing AI provider fallbacks, duplicate-article skips, or a normal zero-new-article run. Each observed error will be compared against the pre-deploy log baseline before being called a regression.

## Verdict

```text
C4A.3D0 PLAN                 PASS
LEGACY MODE GUARANTEED       PASS
ROLLBACK READY               YES
SAFE TO DEPLOY process-rss   YES
```

Awaiting explicit approval before deploying. Nothing has been deployed.
