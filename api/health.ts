// Vercel serverless function — mirrors GET /api/health in server.ts (used
// for local dev / non-Vercel hosts). Keep both in sync if this ever grows
// real logic.
export default function handler(req: any, res: any) {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
}
