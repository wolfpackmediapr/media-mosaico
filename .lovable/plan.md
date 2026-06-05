## Goal
Make Instagram thumbnails render in Redes Sociales by proxying `scontent.cdninstagram.com` URLs through a Supabase edge function, bypassing Instagram's referrer/hotlink block.

## Changes

### 1. New edge function: `social-image-proxy`
- Path: `supabase/functions/social-image-proxy/index.ts`
- Public (no JWT) — declared in `supabase/config.toml` with `verify_jwt = false`.
- Accepts `GET /functions/v1/social-image-proxy?url=<encoded>`.
- Validates the `url` param: must be `https://` and host must end in one of `cdninstagram.com`, `fbcdn.net`, `rss.app` (allowlist to prevent open-proxy abuse).
- Server-side `fetch(url)` (no browser referrer restriction).
- Streams the response body back with:
  - `Content-Type` copied from upstream (default `image/jpeg`)
  - `Cache-Control: public, max-age=86400, immutable`
  - CORS headers
- Returns 400 on invalid input, 502 on upstream failure.

### 2. Frontend rewrite helper
- File: `src/services/social/image-utils.ts` (already exists — extend `getSocialPostImage`).
- Add `proxyInstagramUrl(url)` that, when the URL host matches the allowlist, returns:
  `${VITE_SUPABASE_URL}/functions/v1/social-image-proxy?url=${encodeURIComponent(url)}`.
- Twitter/rss.app-hosted images pass through unchanged.

### 3. Apply rewrite at render
- `src/components/social/SocialPostCard.tsx` already calls `getSocialPostImage(post)` — no further changes needed once the helper rewrites Instagram URLs.
- Also strip inline `<img src="scontent…">` inside the description HTML (in `content-sanitizer.ts`) and replace with the proxied URL, so the small inline thumbnail under the title also loads.

## Out of scope
- Rehosting to Supabase Storage (Option B).
- Backfilling old broken images — once the proxy is live, old cards will start working too because rewrite happens at render time. Only caveat: Instagram signed URLs eventually expire (days), so very old posts may still 404 from upstream.

## Technical notes
- No DB migration, no new secrets.
- No new env vars — function uses public anon key via the standard `/functions/v1/` URL the SDK already knows.
- Open-proxy hardening via host allowlist + size guard (reject responses > 10 MB).
