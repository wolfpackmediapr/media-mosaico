

## Fix: Duplicated User ID in Video Path

### Root Cause

The reassemble-chunked-video function stores assembled files at `${sessionId}/${fileName}` in the `video` bucket (line 63 of reassemble-chunked-video/index.ts), and saves this as `assembled_file_path` in the DB.

But the frontend (line 201 of useTvVideoProcessor.ts) constructs the path as `${user.id}/${assembledFileName}` — which is wrong. This produces a doubled-ID path that doesn't exist in storage.

### Fix (single file: `src/hooks/tv/useTvVideoProcessor.ts`)

**Change 1 — Line 129**: Add `assembled_file_path` to the select query:
```typescript
.select('id, session_id, file_name, file_size, status, created_at, assembled_file_path')
```

**Change 2 — Lines 199-203**: Use the stored `assembled_file_path` instead of manually constructing it:
```typescript
const assembledFileName = matchingChunkSession.file_name.replace(/\s+/g, '_');
const chunkedFilePath = matchingChunkSession.assembled_file_path || `${matchingChunkSession.session_id}/${assembledFileName}`;
fileName = chunkedFilePath;
```

This uses the actual path the reassembly function wrote to storage. Falls back to `sessionId/fileName` (the pattern used by the reassembly function) if `assembled_file_path` is null for any reason.

### No other files changed
- Edge function untouched
- No DB migration needed
- Radio, press modules untouched

