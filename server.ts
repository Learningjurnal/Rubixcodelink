import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { runCategorization } from "./server/categorize";
import { verifyRequestUser } from "./server/auth";
import { checkAndRecordAiUsage, getBearerToken } from "./server/rateLimit";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // AI Smart Categorization & Tagging Endpoint. Requires a valid Supabase
  // session — this calls a paid third-party API (Gemini) using a
  // server-side key shared across the whole deployment — and is further
  // capped by a per-user rate limit (server/rateLimit.ts) so a signed-in
  // caller still can't run up the bill without limit.
  app.post("/api/ai/categorize", async (req, res) => {
    const token = getBearerToken(req.headers.authorization);
    const user = await verifyRequestUser(req.headers.authorization);
    if (!user || !token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rateLimit = await checkAndRecordAiUsage(token, user.id);
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: `Terlalu banyak permintaan AI dalam waktu singkat. Coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      });
      return;
    }
    try {
      const result = await runCategorization(req.body || {});
      res.json({ success: true, result });
    } catch (error: any) {
      console.error("AI Categorization error:", error);
      res.status(500).json({ error: error.message || "Failed to process AI categorization" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
