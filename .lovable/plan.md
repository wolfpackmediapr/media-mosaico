# CP3 Phase A — Browser-Console Connectivity Dry Run (Awaiting Execution)

## Status
- Internal project `qpozetnbnzdinqkrafze`: `portal-sender` ACTIVE (version 2, `verify_jwt=true`), approved sender source installed byte-for-byte, checksums verified.
- Secrets configured: `PORTAL_INGEST_URL`, `PORTAL_INGEST_KEY_ID`, `PORTAL_INGEST_SECRET`, `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false`.
- Blocker: this environment's Supabase connection is external/unmanaged — no service-role token can be minted here, and the server-side invocation returned `401 UNAUTHORIZED_NO_AUTH_HEADER` (rejected before the sender ran; no HMAC request reached the Portal). Authorization must come from the signed-in administrator browser session.
- No source changes will be made; no temporary UI control will be added.

## Next step (user-side, run exactly once)
In the signed-in internal Publiteca preview tab, DevTools → Console:

1. Try the primary snippet:
   ```js
   const { data, error } = await window.supabase.functions.invoke('portal-sender', {
     body: { mode: 'dry_run', run_key: 'cp3-step2-connectivity-001', limit: 5, batch_size: 5 }
   });
   console.log(JSON.stringify({ data, error }, null, 2));
   ```
2. If `window.supabase` is undefined, use the fallback snippet (provided in chat) that reads the Supabase session from localStorage and POSTs with `Authorization: Bearer <accessToken>` — it never prints the token.
3. Paste only the JSON output here (never any JWT/session token). Do not run it a second time.

## Success criteria for Phase A
- Sender HTTP 200; `actor: admin:<uuid>`; `mode: dry_run`; `run_key: cp3-step2-connectivity-001`; `schema_version: 1`; `total_items: 5`; `batch_count: 1`; `test_vector_ok: true`.
- `batches[0]` Portal response HTTP 200 (HMAC accepted).
- Portal: CP2 dry-run observability/staging rows may be created; `portal_clients` must remain 0.

## After the single invocation — STOP
No: test mode, replay/collision tests, tamper tests, schema-v2 probe, enabling apply, Portal user creation, backfill, or any content sync. I will audit the pasted Phase A response against the criteria above and report; anything further requires new authorization.

## Technical details
- Sender expects `Authorization: Bearer <admin user JWT>`; admin check via `user_roles` (`administrator`).
- Dry run sends one HMAC-signed batch (5 clients) to `PORTAL_INGEST_URL` with key id `PORTAL_INGEST_KEY_ID`; apply path stays disabled via `PORTAL_SENDER_ALLOW_APPLY=false`.
