
# Plan: Comprehensive Technical Report (Migration + Handoff)

Deliverable: a single, well-structured Markdown document written to `/mnt/documents/PUBLITECA_TECHNICAL_REPORT.md` and surfaced via `<presentation-artifact>`. Optimized for two audiences: (1) a new engineering team taking over the code, and (2) a DevOps/infra team planning a **migration off Lovable + Supabase managed hosting to a self-hosted server** environment.

## Report Structure

Organized so it can also serve as the migration runbook. Sections:

1. **Executive Summary** — What Publiteca is (Puerto Rico media monitoring: TV, Radio, Prensa Digital/Escrita, Redes Sociales, Alertas), platform purpose, current state, modules, user roles (`administrator` vs `data_entry`), production URL (`app.publitecapr.com`).
2. **Complete Tech Stack** — React 18 + Vite 5 + TS 5 + Tailwind + shadcn/ui + React Query + React Router; Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron, pg_net, pgvector); Lovable hosting; Lovable AI Gateway + Google Gemini + OpenAI + AssemblyAI + Qwen/DashScope + CloudConvert + Typeform + RSS.app.
3. **Frontend Architecture** — Route tree (`src/router.tsx`, `src/routes/*`), layout providers (`AuthProvider`, `RealTimeAlertsProvider`, `MediaPersistenceProvider`), state (React Query + context + persistent-state hooks), UI system, key reusable components, identified duplication (`components/theme-provider.tsx` vs `theme/ThemeProvider.tsx`, dual `use-video-processor` re-exports, `enhanced-client.ts` vs `client.ts`, `services/subscription/*`).
4. **Backend / Database Architecture** — All 53 tables grouped by domain, relationships, RLS model, `has_role` security-definer pattern, storage buckets (`videos`, `video`, `audio`, `radio_audio`, `media`, `pdf_uploads`, `email-assets`), Edge Functions inventory (enumerated from `supabase/functions/`), cron jobs (RSS 30m, Social 60m), pgvector match functions.
5. **Module Deep-Dives** — one subsection per module with file paths, tables, edge functions, and data flow:
   - TV Monitoring (15MB chunked upload, Gemini 2.5 Flash primary + Qwen fallback, speaker ID via vision, `tv_transcriptions`, `tv_news_segments`)
   - Radio Monitoring (AssemblyAI primary, OpenAI Whisper fallback, `transcriptions`, `radio_programs`, DOMPurify notepad sanitization)
   - Prensa Digital / RSS (`feed_sources`, `news_articles`, dedup logic, sentiment analysis)
   - Prensa Escrita / PDF (Gemini File Search, `press_clippings`, `press_file_search_documents`, 100MB cap)
   - Redes Sociales (41 X/Twitter accounts via RSS.app, `media_posts`)
   - Alertas (`client_alerts`, real-time provider, Typeform intake)
   - Client & Admin Dashboards (global date filter, 30s polling + Realtime, buzzwords, category breakdown)
   - Search & filtering, Reports/Exports, Notifications (`notification_preferences`, `notification_delivery_log`).
6. **Integrations Catalog** — table listing each third party, purpose, secret name, calling edge function, docs link, and migration considerations (Supabase, CloudConvert, AssemblyAI, OpenAI, Gemini x3 keys, Qwen, Typeform, RSS.app, Lovable AI Gateway).
7. **Roles & Permissions Matrix** — `administrator` vs `data_entry` × each module, plus notes on RLS gaps found in the linter/security scan.
8. **Data Flow Diagrams** — Mermaid diagrams embedded for: PDF upload → Gemini → clippings; TV upload → chunk → Gemini/Qwen → segments; RSS cron → analysis → dashboard; Typeform → alert → notification; Realtime subscription lifecycle.
9. **Actively-Investigated Known Issues** — populated by running: `supabase--linter`, `security--run_security_scan`, `code--dependency_scan`, `supabase--analytics_query` on recent postgres/edge logs, `supabase--edge_function_logs` on hottest functions, and code-level review for anti-patterns (nullable `user_id` in RLS, missing GRANTs, stale realtime subscriptions, Supabase 1000-row limits, CloudConvert error handling, Gemini quota exhaustion, chunk-cleanup, timestamp accuracy loops).
10. **Recommended Improvements (Categorized)** — Security, Database/Performance, Media pipeline, Observability, Scalability, Cost, UX, Code cleanup. No priority ranking (per user selection).
11. **Deployment & Environment** — Current Lovable + Supabase managed setup, all required env vars (`VITE_SUPABASE_*`) and all 18 Supabase secrets, exposure risk analysis, build process (Vite), SPA routing.
12. **Migration to Self-Hosted Server (primary handoff focus)** — Step-by-step runbook:
    - **Frontend**: build with `vite build`, serve via Nginx/Caddy behind TLS, SPA fallback config sample, environment injection strategy (build-time `VITE_*` vars vs runtime config).
    - **Backend options**:
      - Option A — **Self-hosted Supabase** (Docker Compose / Kubernetes) preserving Postgres + GoTrue + Storage + Edge Runtime + Realtime; migration steps (`pg_dump`, storage bucket sync via `rclone` on S3-compatible backend, redeploy edge functions with `supabase functions deploy`, recreate cron via `pg_cron` + `pg_net`, JWKS/JWT secret setup).
      - Option B — **Decouple**: keep managed Postgres (e.g. RDS/Neon), replace GoTrue with self-hosted or Clerk/Auth.js, replace Edge Functions with Node/Deno services on the server, replace Storage with S3/MinIO, replace Realtime with self-hosted Realtime or Pusher/Ably.
    - **Secrets management** on server (Vault / Doppler / .env with systemd), rotation of `LOVABLE_API_KEY` (or move off Lovable Gateway to direct Gemini/OpenAI keys).
    - **Cron/scheduled jobs** — migrate `pg_cron` triggers or move to systemd timers / GitHub Actions / n8n.
    - **Media processing workers** — extract long-running Gemini/Qwen/AssemblyAI jobs into a queued worker (BullMQ / Redis + Node) instead of Edge Functions to avoid 400s CPU limits.
    - **DNS / domain cutover** for `app.publitecapr.com`, staging plan, rollback strategy.
    - **Cost comparison** at a high level.
13. **Developer Handoff Appendix** — Repo tour (folder-by-folder), coding conventions from memory (`SET search_path`, `has_role`, GRANTs, RLS `auth.uid() IS NOT NULL`, DOMPurify, realtime cleanup), local dev setup, "where do I go to change X" quick reference, glossary.

## Investigation Steps Before Writing

Executed in parallel where independent:
- `code--list_dir supabase/functions` + read `supabase/config.toml`
- Enumerate `src/routes/*`, `src/pages/*`, `src/hooks/*`, `src/services/*`
- `supabase--linter` — surface RLS/security warnings
- `security--run_security_scan` — surface persisted findings
- `code--dependency_scan` — outdated/vulnerable deps
- `supabase--read_query` — table columns, FKs, RLS policies for each of the 53 tables (batched)
- `supabase--analytics_query` — last 100 errors from `postgres_logs` and `function_edge_logs`
- `supabase--edge_function_logs` — spot-check high-traffic functions (TV processing, PDF, RSS ingest)
- Read `.env`, `package.json`, `vite.config.ts`, `index.html`, `tailwind.config.ts`

## Output Format

- Single Markdown file, ~30–50 pages when rendered, table of contents with anchor links.
- Mermaid diagrams embedded inline (rendered by the artifact viewer).
- Tables for: integrations, secrets, tables-by-module, roles matrix, env vars, edge functions.
- All file paths and function names as inline code so they are copy-pasteable.
- Final tag:  
  `<presentation-artifact path="PUBLITECA_TECHNICAL_REPORT.md" mime_type="text/markdown"></presentation-artifact>`

No code changes to the application; this is a documentation-only deliverable.
