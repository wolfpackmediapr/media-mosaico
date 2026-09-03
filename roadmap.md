# Roadmap

## Active
- [ ] CP5-C4A.3D1 Shadow Canary — execute approved plan, final report, stop for authorization
  - Step 1: pre-canary verification (hashes, HEAD, cron health, log retrievability, DIGITAL_CLIENT_MATCHER_MODE current state)
  - Step 2: activate shadow (minimum config mutation only)
  - Step 3: observe 3 natural cron runs (16:00/16:30/17:00 UTC approx)
  - Step 4: aggregate shadow comparison
  - Step 5: safety verification (rollback = restore exact pre-canary config)
  - Step 6: final report with single verdict

## Blocked / awaiting user
- C4A.3D2+ / authoritative activation / C4B — NOT authorized
