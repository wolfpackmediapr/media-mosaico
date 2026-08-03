# Prensa Escrita: Unlimited-OCR evaluation and optional OCR fallback

## Recommendation

Do not replace the Gemini pipeline with `baidu/Unlimited-OCR`. It is a model weights repo, not an API: it needs a GPU host, and it only produces raw text. The current flow does OCR *and* the analysis (summary, 5W, categories, client matching, searchable indexing) in one call, so swapping it in adds a stage instead of removing one.

Instead: keep Gemini as the primary engine and add an **optional OCR fallback** that only runs when Gemini's extraction is clearly poor (scanned or low-quality newspaper pages). This is the low-risk way to get the accuracy benefit without a rewrite or an always-on GPU bill.

## Scope

1. **Quality gate on the existing flow**
   - In `process-press-pdf-filesearch`, score the Gemini result (extracted text length per page, empty-summary, low clipping count).
   - Below threshold, mark the job `needs_ocr_fallback` instead of silently returning a thin summary.

2. **OCR fallback service**
   - New edge function `ocr-press-pdf`: renders/forwards the stored PDF pages to a pay-per-use GPU endpoint (Replicate, or an HF Inference Endpoint) running an OCR VLM, and returns plain text.
   - Requires one secret (`REPLICATE_API_TOKEN` or `HF_TOKEN`). Pay-per-second only, no idle cost.

3. **Re-analysis pass**
   - Feed the recovered OCR text back through the same Gemini analysis prompt (text-only, cheaper) so summary, categories, keywords and client matching stay identical in shape.
   - Persist to the same `pdf_processing_jobs` / File Search document records so Historial and Resultados are unchanged.

4. **UI**
   - Small "Reprocesar con OCR" action on a job in Historial for manual retry.
   - Status chip when a job used the OCR fallback.

## Technical notes

- Unlimited-OCR cannot run inside Supabase Edge Functions (Deno, CPU-only, ~5MB bundle limit, short timeouts). Any use of it goes through an external GPU inference host.
- Model choice on the GPU host is swappable; we start with whatever the provider exposes for document OCR and can point it at Unlimited-OCR if you deploy a dedicated endpoint for it.
- No database schema change beyond one nullable status/flag column on the jobs table.

## Suggested first step

Before building any of this, run a **cheap bake-off**: take 3-5 real problem PDFs, run them through the current flow and through a hosted OCR endpoint, and compare extracted text. If Gemini is already fine on your actual documents, we stop here and change nothing.
