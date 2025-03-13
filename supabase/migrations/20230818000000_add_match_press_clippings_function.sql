
-- Create a match_press_clippings function for vector similarity search
CREATE OR REPLACE FUNCTION match_press_clippings(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  page_number int,
  publication_name text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.title,
    pc.content,
    pc.page_number,
    pc.publication_name,
    pc.category,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM press_clippings pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
