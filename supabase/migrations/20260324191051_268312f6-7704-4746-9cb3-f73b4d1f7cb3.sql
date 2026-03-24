-- Deactivate broken RSS feed sources replaced by working Web versions
UPDATE feed_sources 
SET active = false, error_count = 0, last_fetch_error = 'Deactivated: replaced by Web source'
WHERE id IN (
  'e9652094-1504-4fa0-92ce-2054b8c4f80f',
  '7bef020c-97f9-43fe-a51b-617608b89f7d'
);