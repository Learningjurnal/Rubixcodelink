-- Repair (or optionally purge) subfolders that were persisted inside
-- user_folders.subfolders (a jsonb array) without a real `id` field.
--
-- Root cause: older Excel-import runs (before storageExcelHelper.ts's id
-- generation was solidified) produced subfolder objects with no `id`.
-- Every subfolder-targeting action in the app (edit, delete, move, bulk
-- select) needs that id to find its target inside the array, so these
-- rows are permanently stuck today — confirmed live via the app's own
-- "18 subfolder terpilih, tapi tidak satu pun punya id database yang
-- valid" guard.
--
-- Run the sections below ONE AT A TIME in the Supabase SQL Editor, in
-- order: 0) look, then EITHER 1a) repair OR 1b) purge (not both), then
-- 2) verify. Do not run 1a and 1b in the same session on the same rows.

-- =========================================================================
-- 0) LOOK FIRST — how many subfolders, in how many folders, are affected.
--    Always run this before touching anything.
-- =========================================================================
select
  id as folder_id,
  name as folder_name,
  jsonb_array_length(subfolders) as total_subfolders,
  (
    select count(*)
    from jsonb_array_elements(subfolders) as elem
    where elem->>'id' is null or elem->>'id' = ''
  ) as subfolders_missing_id
from public.user_folders
where exists (
  select 1 from jsonb_array_elements(subfolders) as elem
  where elem->>'id' is null or elem->>'id' = ''
)
order by subfolders_missing_id desc;

-- =========================================================================
-- 1a) RECOMMENDED — REPAIR: assign each id-less subfolder a fresh id.
--     Nothing is deleted. Subfolders that already have a valid id are
--     left byte-for-byte unchanged (order is preserved via ordinality).
--     Requires pgcrypto's gen_random_uuid() — already enabled in this
--     project (used by every table's own `id` column default).
-- =========================================================================
update public.user_folders t
set subfolders = coalesce((
  select jsonb_agg(
    case
      when (elem->>'id' is null or elem->>'id' = '')
      then elem || jsonb_build_object('id', 'sub-repair-' || gen_random_uuid()::text)
      else elem
    end
    order by ord
  )
  from jsonb_array_elements(t.subfolders) with ordinality as x(elem, ord)
), '[]'::jsonb),
updated_at = extract(epoch from now()) * 1000
where exists (
  select 1 from jsonb_array_elements(t.subfolders) as elem
  where elem->>'id' is null or elem->>'id' = ''
);

-- =========================================================================
-- 1b) ALTERNATIVE — PURGE: permanently remove every subfolder entry that
--     has no id, instead of repairing it. THIS DELETES DATA — the files
--     and metadata recorded on those subfolder entries are gone for good,
--     not just "hidden". Only run this if you are sure those specific
--     entries are junk/duplicates you don't need, not real folders you
--     just haven't been able to touch yet. folders_count is recomputed to
--     match so the UI's own subfolder counts stay correct.
-- =========================================================================
-- update public.user_folders t
-- set subfolders = coalesce((
--   select jsonb_agg(elem order by ord)
--   from jsonb_array_elements(t.subfolders) with ordinality as x(elem, ord)
--   where elem->>'id' is not null and elem->>'id' != ''
-- ), '[]'::jsonb),
-- folders_count = coalesce((
--   select count(*)
--   from jsonb_array_elements(t.subfolders) as elem
--   where elem->>'id' is not null and elem->>'id' != ''
-- ), 0),
-- updated_at = extract(epoch from now()) * 1000
-- where exists (
--   select 1 from jsonb_array_elements(t.subfolders) as elem
--   where elem->>'id' is null or elem->>'id' = ''
-- );

-- =========================================================================
-- 2) VERIFY — re-run the query from step 0. It should now return zero rows.
-- =========================================================================
