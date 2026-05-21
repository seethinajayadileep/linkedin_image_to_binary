-- ============================================================
-- Run this entire file in Supabase → SQL Editor → Run
-- ============================================================

-- 1. Images metadata table
create table if not exists images (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  storage_path  text        not null unique,
  mime_type     text        not null,
  size          bigint      not null,
  created_at    timestamptz not null default now()
);

-- 2. Disable RLS so the service-role key has unrestricted access
alter table images disable row level security;

-- ============================================================
-- After running this SQL:
--   Go to Storage → New Bucket
--   Name: images
--   Public: OFF  (we serve files through our backend)
-- ============================================================
