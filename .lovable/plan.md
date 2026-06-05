## Plan: Add 13 social feeds (12 + INDUNIV) to Redes Sociales

All 13 feeds will be appended to `SOCIAL_FEEDS` in `supabase/functions/process-social-feeds/constants.ts` using the JSON v1.1 URL pattern `https://rss.app/feeds/v1.1/{ID}.json`. No processor changes — the existing `processRssJsonFeed` handles them, and `instagram` is already in `SOCIAL_PLATFORMS` so the Instagram icon (already defined in `src/lib/platform-icons.tsx`) will render automatically next to each post.

### Entries to append

| Name | Platform | Feed ID |
|------|----------|---------|
| La Fortaleza | instagram | iNq4TI2MxVgtHR3t |
| Jenniffer González | instagram | N6JfDAhqIKWq5x4W |
| DDEC | instagram | ci2oAm96pI9w3nF4 |
| PRIDCO | instagram | bpocIAq25wwFhldi |
| Roberto Lefranc Fortuño | instagram | wA0tGymiwGq7Zfnt |
| PRFAA | instagram | xKyIwIcm4Wx7oFC1 |
| Municipio de Juncos | instagram | krpvxLcSphDzGCZA |
| PRMA | instagram | 5zr5dGnelbfhAXUh |
| Cámara de Comercio PR | twitter | fyHIr8k2uDBONIhD |
| PIA Puerto Rico | instagram | zcpd8UjmqsAsLkuK |
| PR Science Trust | instagram | gVi1cBJpnqC883S0 |
| Invest Puerto Rico | instagram | KqDAsz3K05A15HUF |
| INDUNIV | instagram | RGTLzu33tiyv0lyA |

INDUNIV: original XML URL is converted to the JSON v1.1 form and classified as `instagram` so it shows under Redes Sociales with the Instagram icon. Not added to Prensa Digital.

### Verification

- File parses (no duplicate IDs / names).
- After deploy, manual refresh from Redes Sociales populates the 13 new feeds; Instagram icon renders via existing `platformIcons.instagram`.

### Out of scope

- Category labels (Gobierno / Industria / etc.) — deferred.
- No schema changes, no new tables, no UI changes.
- If any feed ID is XML-only on rss.app and the JSON URL 404s, it will surface as `error_count > 0` on `feed_sources` and we'll revisit individually.
