
-- Create processing_errors table for tracking failures
create table if not exists public.processing_errors (
  id uuid default uuid_generate_v4() primary key,
  stage text not null,
  error_message text not null,
  article_info jsonb,
  raw_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create function to ensure table exists
create or replace function create_processing_errors_if_not_exists()
returns void
language plpgsql
as $$
begin
  create table if not exists public.processing_errors (
    id uuid default uuid_generate_v4() primary key,
    stage text not null,
    error_message text not null,
    article_info jsonb,
    raw_content text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );
end;
$$;
