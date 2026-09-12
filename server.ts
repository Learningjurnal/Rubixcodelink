import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { runCategorization } from "./server/categorize";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // AI Smart Categorization & Tagging Endpoint
  app.post("/api/ai/categorize", async (req, res) => {
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
