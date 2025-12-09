-- Update El Nuevo Día feed URL to new paid subscription
UPDATE feed_sources 
SET url = 'https://rss.app/feeds/v1.1/Zk2ySs2LemEIrBaR.json',
    error_count = 0,
    last_fetch_error = NULL,
    updated_at = NOW()
WHERE id = 'e9652094-1504-4fa0-92ce-2054b8c4f80f';

-- Deactivate broken Jay Fonseca feed (404 errors)
UPDATE feed_sources 
SET active = false,
    updated_at = NOW()
WHERE id = '1f7a9696-5ca4-4276-9ecf-f8b0a83bd8b4';