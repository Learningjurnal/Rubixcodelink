-- Command Center: Postgres schema for Supabase, replacing Firestore.
--
-- Every table here is per-user (scoped by user_id = auth.uid()). The old
-- Firestore deployment also had a global "links" / "settings" collection
-- with NO auth check at all (see the production-readiness audit) — that
-- collection was dead code in the current UI (App.tsx always requires a
-- signed-in user before rendering), so it is intentionally NOT recreated
-- here. Do not add an unauthenticated-writable table without a real use
-- case and explicit RLS review.
--
-- Apply with: supabase db push
-- (or paste into the Supabase dashboard's SQL editor)

-- ---------------------------------------------------------------------
-- user_links  (was: users/{userId}/links in Firestore)
-- ---------------------------------------------------------------------
create table if not exists public.user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text default '',
  link text not null,
  status text not null default 'Blank',
  output text not null default 'Single',
  region text not null default 'LIVE',
  counta integer not null default 1,
  note text default '',
  tag text default '',
  diperbarui text default '',
  created_at bigint not null,
  downloaded_at text,
  user_email text,
  inserted_at timestamptz not null default now()
);

create index if not exists user_links_user_id_created_at_idx
  on public.user_links (user_id, created_at desc);

alter table public.user_links enable row level security;

create policy "user_links: owner select" on public.user_links
  for select using (auth.uid() = user_id);
create policy "user_links: owner insert" on public.user_links
  for insert with check (auth.uid() = user_id);
create policy "user_links: owner update" on public.user_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_links: owner delete" on public.user_links
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_folders  (was: users/{userId}/folders in Firestore)
-- `files` stays a JSON array (StorageFile[]) exactly like the Firestore
-- document did, to keep the migration low-risk. Normalizing it into a
-- separate `user_folder_files` table is a reasonable follow-up, not done
-- here.
-- ---------------------------------------------------------------------
create table if not exists public.user_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Folder',
  description text default '',
  theme_color text not null default 'blue',
  used_storage_formatted text not null default '0MB',
  total_capacity_formatted text not null default '1GB',
  used_bytes bigint not null default 0,
  capacity_bytes bigint not null default 1073741824,
  files_count integer not null default 0,
  folders_count integer not null default 0,
  shared_count integer not null default 0,
  tags jsonb not null default '[]',
  owner_name text not null default 'Saya',
  owner_avatar text,
  created_at text not null default to_char(now(), 'Mon DD, YYYY'),
  files jsonb not null default '[]',
  updated_at bigint
);

create index if not exists user_folders_user_id_idx on public.user_folders (user_id);

alter table public.user_folders enable row level security;

create policy "user_folders: owner select" on public.user_folders
  for select using (auth.uid() = user_id);
create policy "user_folders: owner insert" on public.user_folders
  for insert with check (auth.uid() = user_id);
create policy "user_folders: owner update" on public.user_folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_folders: owner delete" on public.user_folders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_settings  (was: users/{userId}/settings/app_config in Firestore)
-- one row per user.
-- ---------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status_options jsonb not null default '["Blank","Sudah Terunduh","Proses","Gagal","Web Inactive"]',
  output_options jsonb not null default '["Single","Batch","Bulk","Folder","Mirror"]',
  region_options jsonb not null default '["LIVE","ASIA","US","EU","ID","GLOBAL"]',
  note_presets jsonb not null default '["Web Inactive","Perlu VPN","Captcha Aktif","File Rusak / Corrupt","Kecepatan Tinggi","Kadaluarsa"]',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: owner select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings: owner insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings: owner update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings: owner delete" on public.user_settings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Realtime: let Supabase broadcast postgres_changes for these tables so
-- subscribeToUserLinks / subscribeToUserFolders / subscribeToUserSettings
-- in src/lib/supabase.ts receive live updates (mirrors Firestore onSnapshot).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.user_links;
alter publication supabase_realtime add table public.user_folders;
alter publication supabase_realtime add table public.user_settings;
