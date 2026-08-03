# Audit: client variables and prompts across Prensa Escrita, TV and Radio

## Which Google API does Prensa Escrita use?

Prensa Escrita uses the **Google Gemini Developer API** (`generativelanguage.googleapis.com/v1beta`), authenticated with the `GOOGLE_GEMINI_API_KEY` secret — not Vertex AI, not the Lovable AI Gateway. Three endpoints of that same API are in play, in `process-press-pdf-filesearch`:

| Purpose | Endpoint |
|---|---|
| Create / list the vector store | `v1beta/fileSearchStores` (store `press-clippings-store`) |
| Upload + index the PDF | `upload/v1beta/{store}:uploadToFileSearchStore`, then poll `v1beta/{operation}` |
| Analyze / search | `v1beta/models/gemini-2.5-flash:generateContent` with the `file_search` tool |

`search-press-filesearch` calls the same `gemini-2.5-flash:generateContent` with the `file_search` tool. TV uses separate keys (`GOOGLE_GEMINI_API_KEY_TV` / `_TV_2`) against the same Developer API; Radio analysis runs on a different path.

## Client variables: what each module actually sends

All three modules read the same `public.clients` table from Ajustes > Clientes, but they load and format it differently.

| | Prensa Escrita | TV | Radio |
|---|---|---|---|
| Where clients are loaded | Server (`process-press-pdf-filesearch`) | Server (`process-tv-with-gemini`, `process-tv-with-qwen`) | Browser, then posted to the function (`useClientData` -> `RadioAnalysis`) |
| Fields used | name, category, keywords | name, keywords | name, keywords |
| `is_active` respected | No | No | No |
| Row cap | none | none | `.limit(100)` in `useClientData` |
| Categories source | `categories` table, hardcoded fallback | dynamic | dynamic, hardcoded fallback |
| Grouped by category in prompt | Yes | No | No |
| Relevance levels enforced | No — prompt says only "inclúyelos en relevant_clients si aparecen" | Yes — ALTA / MEDIA only, with criteria and required quotes | No — free-form "clientes que podrían estar interesados" |
| Anti-hallucination rules | No | Yes (no prior knowledge; only names present in transcript/chyrons) | No |

## Findings

1. **Inactive clients leak into every AI prompt.** There are 26 clients, 4 of them inactive, and none of the three analysis paths filter `is_active`. Only `get-typeform-alerts` filters. Deactivating a client in Ajustes currently has no effect on Prensa, TV or Radio analysis.
2. **Prensa Escrita has no relevance threshold.** TV was tightened to ALTA/MEDIA only; Prensa still returns any client whose keyword happens to appear, so `relevant_clients` is noisier than TV's list.
3. **Radio has the weakest prompt of the three.** It asks for "clients who might be interested", with no relevance levels, no criteria, and no requirement to justify with a quote — the same wording that caused the irrelevant-client complaints on TV.
4. **Radio has no anti-hallucination guard.** TV forbids filling in names from prior knowledge of Puerto Rico; Radio does not, so that hallucination class can still occur there.
5. **Radio's 100-row client cap** is harmless today (26 clients) but will silently truncate later.
6. **Client keywords are wired consistently** in all three — no gap there; every client currently has at least one keyword.

## Proposed fixes

Ordered by impact, none of them structural:

1. Filter `is_active` (treating NULL as active) everywhere clients feed an AI prompt: `process-press-pdf-filesearch`, `process-press-pdf`, `process-tv-with-gemini`, `process-tv-with-qwen`, `analyze-tv-stored`, the Radio analysis path, and `useClientData`.
2. Bring the Prensa Escrita client section up to TV's standard: ALTA/MEDIA only, explicit relevance criteria, and a short justifying quote per client.
3. Bring Radio's client section up to that same standard, and add TV's anti-hallucination rules to the Radio prompt.
4. Remove the 100-row cap in `useClientData` and load only active clients, ordered by name.
5. Optionally extract one shared `buildClientRelevanceSection()` helper under `supabase/functions/_shared/` so the three modules can no longer drift apart again.

Nothing about the Gemini setup in Prensa Escrita changes — same API, same key, same File Search store.