

## Copy as Rich Text from Analysis Cards

### Change
**One file**: `src/components/tv/analysis/TvFormattedAnalysisResult.tsx`

Update `handleCopy` (line 38-46) to use the Clipboard API's `write()` method with a `ClipboardItem` containing both `text/html` (formatted) and `text/plain` (fallback). The HTML version uses the already-existing `markdownToHtml()` function to convert the content. When pasted into Google Docs, Word, email, etc., the formatting (bold, italic, line breaks) will be preserved.

```ts
const handleCopy = (text: string, index: number) => {
  const html = DOMPurify.sanitize(markdownToHtml(text));
  const blob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([text], { type: 'text/plain' });
  navigator.clipboard.write([
    new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })
  ]).then(() => {
    setCopiedIndex(index);
    toast.success("Texto copiado al portapapeles");
    setTimeout(() => setCopiedIndex(null), 2000);
  }).catch(() => {
    // Fallback for older browsers
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast.success("Texto copiado al portapapeles");
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  });
};
```

### Scope
- One function replacement (~15 lines)
- No other files, edge functions, or DB changes

