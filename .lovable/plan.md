

## Add Copy Button to Analysis Cards (Bottom-Right Position)

### Change
**One file**: `src/components/tv/analysis/TvFormattedAnalysisResult.tsx`

Add a small copy-to-clipboard button at the bottom-right corner of each card (both "Programa Regular" and "Anuncio Publicitario").

### Implementation
- Import `Copy` and `Check` from `lucide-react`, `toast` from `sonner`, and `useState` for tracking copied state per card index
- Add a `handleCopy(text, index)` function using `navigator.clipboard.writeText()` with a 2-second checkmark confirmation
- After the scrollable content `<div>`, add a footer row with `flex justify-end` containing a small ghost `Button` (`h-7 w-7`) with the Copy/Check icon
- Apply to both the fallback single-card render and the `renderContentSection` function
- Copied text is the raw `content` string (plain text, no HTML)

### Scope
- One frontend file only
- No edge function, radio, DB, or other changes

