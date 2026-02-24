

## Plan: Strengthen Prensa Escrita System

Targeted improvements to fix bugs and add robustness to the Prensa Escrita module only. No changes to radio, TV, prensa digital, redes sociales, or any other section.

---

### 1. Fix Search Race Condition (Bug)

**Problem:** In `SearchClippingsContainer.tsx`, after `await searchClippings(searchQuery)`, the code checks `searchResults.length === 0` -- but `searchResults` still holds the *previous* state value (React state is stale in the same render cycle). This causes a false "Sin resultados" toast even when results were found.

**File:** `src/components/prensa-escrita/search/SearchClippingsContainer.tsx`
- Use the return value of `searchClippings()` instead of reading stale `searchResults` state:
```typescript
const results = await searchClippings(searchQuery);
if (results.length === 0 && !searchError) {
  toast.info("Sin resultados", { ... });
}
```

---

### 2. Fix `isSubmitting` Never Resetting (Bug)

**Problem:** In `PDFUploadContainer.tsx`, `isSubmitting` is set to `true` before calling `onFileSelect`, but on success it's never set back to `false`. If the user returns to upload another file, the button stays disabled.

**File:** `src/components/prensa-escrita/upload/PDFUploadContainer.tsx`
- Add `setIsSubmitting(false)` in a `finally` block after the `onFileSelect` call, or reset it when a new file is selected / processing completes.

---

### 3. Fix Duplicate Type Definitions (Tech Debt)

**Problem:** `PressClipping` and `ProcessingJob` are defined in both `src/types/pdf-processing.ts` and `src/hooks/prensa/types.ts`. The hooks version has more fields (e.g., `DocumentMetadata`). The duplicate file can cause confusion.

**File:** `src/types/pdf-processing.ts`
- Replace the duplicate definitions with re-exports from the canonical source:
```typescript
export type { PressClipping, ProcessingJob } from '@/hooks/prensa/types';
```

---

### 4. Add Publication Date Picker to Upload Form

**Problem:** `publication_date` in the `press_clippings` table defaults to `now()`, which is incorrect -- the newspaper date is usually different from the upload date.

**Files:**
- `src/components/prensa-escrita/upload/PDFUploadForm.tsx` -- Add an optional date picker using the existing `DatePicker` component. Add a `publicationDate` prop.
- `src/components/prensa-escrita/upload/PDFUploadContainer.tsx` -- Add `publicationDate` state, pass it to `PDFUploadForm` and include it in `onFileSelect` call.
- `src/components/prensa-escrita/UploadContentTab.tsx` -- Update the `onFileSelect` signature to include `publicationDate?: Date`.
- `src/components/prensa-escrita/PressTabsContainer.tsx` -- Update prop types accordingly.
- `src/pages/PrensaEscrita.tsx` -- Pass `publicationDate` through to `processFile`.
- `src/hooks/prensa/usePdfProcessing.ts` -- Accept optional `publicationDate` in `processFile`.
- `src/hooks/prensa/useFileProcessing.ts` -- Pass `publicationDate` to `processFileWithFileSearch` and `createProcessingJob`.
- `src/services/prensa/fileProcessor.ts` -- Include `publication_date` in the job insert and in the File Search edge function call body.

This is purely additive -- the date is optional, defaults to today, and flows through existing props.

---

### 5. Add Processing History Tab

**Problem:** Users have no way to see previously processed PDFs. The `pdf_processing_jobs` table already stores this data.

**New files:**
- `src/components/prensa-escrita/history/ProcessingHistoryContainer.tsx` -- A card listing past jobs from `pdf_processing_jobs`, showing publication name, status, date, and summary (if available). Fetches via Supabase client (`select from pdf_processing_jobs order by created_at desc limit 20`).
- `src/components/prensa-escrita/history/ProcessingHistoryItem.tsx` -- Individual row/card for a past job.

**Modified files:**
- `src/components/prensa-escrita/PressTabsContainer.tsx` -- Add a third tab "Historial" with a clock icon, rendering `ProcessingHistoryContainer`.

---

### 6. Stabilize Job Polling (Memory Leak Fix)

**Problem:** In `useJobPolling.ts`, the `startPolling` callback has `isPolling` and `lastPollTimestamp` in its dependency array. Every time these change, the `useEffect` restarts the interval, creating a new `setInterval` and potentially leaking the old one (the cleanup runs, but rapid toggling can cause issues).

**File:** `src/hooks/prensa/useJobPolling.ts`
- Use refs for `isPolling` and `lastPollTimestamp` instead of state to avoid re-creating the interval on every poll cycle. Keep the interval stable with only `isActive` and `jobId` as true dependencies.

---

### Summary of Files Touched

| File | Change |
|---|---|
| `src/components/prensa-escrita/search/SearchClippingsContainer.tsx` | Fix stale state race condition |
| `src/components/prensa-escrita/upload/PDFUploadContainer.tsx` | Fix isSubmitting not resetting |
| `src/types/pdf-processing.ts` | Replace duplicates with re-exports |
| `src/components/prensa-escrita/upload/PDFUploadForm.tsx` | Add date picker |
| `src/components/prensa-escrita/upload/PDFUploadContainer.tsx` | Add publicationDate state |
| `src/components/prensa-escrita/UploadContentTab.tsx` | Pass publicationDate prop |
| `src/components/prensa-escrita/PressTabsContainer.tsx` | Pass publicationDate + add History tab |
| `src/pages/PrensaEscrita.tsx` | Thread publicationDate through |
| `src/hooks/prensa/usePdfProcessing.ts` | Accept publicationDate |
| `src/hooks/prensa/useFileProcessing.ts` | Pass publicationDate to services |
| `src/services/prensa/fileProcessor.ts` | Include publication_date in job/API |
| `src/hooks/prensa/useJobPolling.ts` | Stabilize with refs |
| `src/components/prensa-escrita/history/ProcessingHistoryContainer.tsx` | **NEW** - History list |
| `src/components/prensa-escrita/history/ProcessingHistoryItem.tsx` | **NEW** - History item |

**No changes** to any radio, TV, prensa digital, redes sociales, sidebar, routing, or site-wide components.

