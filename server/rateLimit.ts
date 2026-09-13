import { createClient } from '@supabase/supabase-js';

/**
 * Per-user rate limit for endpoints that call a paid third-party API
 * (currently: POST /api/ai/categorize -> Gemini) using a server-side key
 * shared across the whole deployment. verifyRequestUser (server/auth.ts)
 * already rejects anyone without a valid Supabase session, but does
 * nothing to stop a signed-in user — or a leaked/replayed access token —
 * from calling the endpoint without limit and running up the bill.
 *
 * Vercel serverless functions are stateless across invocations, so an
 * in-memory counter would not survive between calls; usage is persisted
 * in public.ai_categorize_usage instead (supabase/migrations/0004_*.sql),
 * scoped to the caller's own row via RLS by signing the query with the
 * caller's own access token (not the anon key alone), exactly like the
 * browser client does — `auth.uid()` then resolves server-side and the
 * "owner only" policy applies the same way it does everywhere else in
 * this schema.
 */
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 10;

export function getBearerToken(authorizationHeader: string | undefined | null): string | null {
  return authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkAndRecordAiUsage(accessToken: string, userId: string): Promise<RateLimitResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Unreachable in practice: verifyRequestUser already requires these
    // same env vars and would have returned null first. Fail open rather
    // than crash, since this is config, not a security decision.
    return { allowed: true };
  }

  // A client carrying the caller's own access token, so `auth.uid()`
  // resolves to them server-side and RLS scopes the query to their own
  // usage rows — the same trust model every other table in this app uses.
  const scoped = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await scoped
    .from('ai_categorize_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  if (countError) {
    // Degraded mode: don't let a transient DB/RLS hiccup block a
    // legitimate request, but don't pretend this was a clean check either.
    console.warn('AI rate-limit check failed, allowing request in degraded mode:', countError);
    return { allowed: true };
  }

  if ((count || 0) >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS };
  }

  const { error: insertError } = await scoped.from('ai_categorize_usage').insert({ user_id: userId });
  if (insertError) {
    // Don't block the actual request over a logging failure, but do make
    // it visible — silent failure here would let the limit quietly stop
    // being enforced at all.
    console.warn('AI rate-limit usage log insert failed (request still allowed):', insertError);
  }

  return { allowed: true };
}
