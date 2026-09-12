-- Fixes gaps from the initial migration: several StorageFolder fields
-- that are actively populated by the app (subfolders via
-- FolderDetailModal, hdd_id/hdd_name/path via the Excel scanner import
-- and HDD Settings' "add custom folder", sample_image_url/hidden via
-- FolderDetailModal's edit form) never got columns. Each was silently
-- dropped by updateUserFolderInFirestore's allowlist-based patch
-- builder / addUserFolderToFirestore's insert and never persisted.

alter table public.user_folders
  add column if not exists subfolders jsonb not null default '[]',
  add column if not exists hdd_id text,
  add column if not exists hdd_name text,
  add column if not exists path text,
  add column if not exists sample_image_url text,
  add column if not exists sample_image_hidden boolean not null default false;
