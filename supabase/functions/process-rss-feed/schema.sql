
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

-- Function to get platforms with post counts
create or replace function get_platforms_with_counts()
returns table (
  id text,
  name text,
  count bigint
)
language sql
as $$
  select 
    fs.platform as id,
    coalesce(fs.platform_display_name, initcap(fs.platform)) as name,
    count(na.id) as count
  from 
    feed_sources fs
  left join 
    news_articles na on fs.id = na.feed_source_id
  where 
    fs.platform is not null
  group by 
    fs.platform, fs.platform_display_name
  order by 
    count desc, name asc;
$$;
