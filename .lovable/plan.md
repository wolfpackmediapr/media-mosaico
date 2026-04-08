

## Fix: Storage Bucket + Remove Unused Constant

Two changes in `supabase/functions/process-tv-with-qwen/index.ts`:

1. **Line 15**: Remove `MAX_VIDEO_DURATION_SECONDS` constant (unused, no duration metadata available at this point)
2. **Line 215**: Change `.from('media')` to `.from('video')` to match the correct storage bucket

No other files modified.

