import { createClient } from '@supabase/supabase-js';

/**
 * Verifies a Supabase access token sent by the client (Authorization:
 * Bearer <token>) and returns the authenticated user, or null if missing/
 * invalid. Shared by both the Express server (server.ts) and the Vercel
 * serverless functions (api/**) so every server-side endpoint that costs
 * money or touches user data requires a real signed-in session — never
 * just "is this a POST request".
 */
export async function verifyRequestUser(authorizationHeader: string | undefined | null) {
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (!token) return null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
