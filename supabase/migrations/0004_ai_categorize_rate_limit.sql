-- Usage log backing a per-user rate limit for POST /api/ai/categorize
-- (server/rateLimit.ts). That endpoint calls a paid third-party API
-- (Gemini) using a server-side key shared across the whole deployment;
-- auth alone (verifyRequestUser) stops an UNauthenticated caller, but
-- does nothing to stop a signed-in user (or a leaked/replayed access
-- token) from calling it without limit and running up the bill.
--
-- Vercel serverless functions are stateless across invocations, so an
-- in-memory counter would not survive between calls — this table is the
-- persistent store the rate limiter checks against instead. RLS scopes
-- every row to its owner, matching every other table in this schema.
--
-- Apply with: supabase db push
-- (or paste into the Supabase dashboard's SQL editor)

create table if not exists public.ai_categorize_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_categorize_usage_user_id_created_at_idx
  on public.ai_categorize_usage (user_id, created_at desc);

alter table public.ai_categorize_usage enable row level security;

-- Only insert + select are needed (the rate limiter counts rows in a
-- recent window, then inserts one to record the call). No update/delete
-- policy is created on purpose — usage rows are an append-only audit
-- trail; old rows can be pruned later by a scheduled job running as the
-- service role, which bypasses RLS entirely.
create policy "ai_categorize_usage: owner select" on public.ai_categorize_usage
  for select using (auth.uid() = user_id);
create policy "ai_categorize_usage: owner insert" on public.ai_categorize_usage
  for insert with check (auth.uid() = user_id);
