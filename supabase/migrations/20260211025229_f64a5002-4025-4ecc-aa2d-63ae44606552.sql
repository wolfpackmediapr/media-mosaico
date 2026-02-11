
-- Delete duplicate news_articles, keeping the oldest entry per (title, source, day) group
DELETE FROM news_articles
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY title, source, date_trunc('day', pub_date)
             ORDER BY created_at ASC
           ) as rn
    FROM news_articles
  ) ranked
  WHERE rn > 1
);
