-- Create File Search documents tracking table
CREATE TABLE press_file_search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  publication_name TEXT NOT NULL,
  publication_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- File Search Store references
  file_search_store_id TEXT NOT NULL,
  file_search_document_id TEXT NOT NULL,
  
  -- Original file info
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  -- Processing metadata
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  
  -- Extracted insights from File Search
  document_summary TEXT,
  total_clippings_found INTEGER DEFAULT 0,
  categories TEXT[],
  keywords TEXT[],
  relevant_clients TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE press_file_search_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own documents"
  ON press_file_search_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON press_file_search_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON press_file_search_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON press_file_search_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_press_fs_user_date 
  ON press_file_search_documents(user_id, publication_date DESC);
CREATE INDEX idx_press_fs_store 
  ON press_file_search_documents(file_search_store_id, file_search_document_id);

-- Updated_at trigger
CREATE TRIGGER update_press_fs_docs_updated_at
  BEFORE UPDATE ON press_file_search_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();