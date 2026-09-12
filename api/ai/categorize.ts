import { runCategorization } from '../../server/categorize';
import { verifyRequestUser } from '../../server/auth';

// Vercel serverless function for POST /api/ai/categorize. Vite builds a
// static SPA on Vercel (no Express process runs in production), so this
// endpoint — not server.ts — is what actually serves the request in
// production. Both entry points share the logic in server/categorize.ts.
//
// Requires a valid Supabase session (Authorization: Bearer <access_token>)
// — this calls a paid third-party API (Gemini) using a server-side key
// shared across the whole deployment, so an unauthenticated caller must
// never be able to trigger it.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await verifyRequestUser(req.headers?.authorization);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await runCategorization(req.body || {});
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('AI Categorization error:', error);
    res.status(500).json({ error: error.message || 'Failed to process AI categorization' });
  }
}
