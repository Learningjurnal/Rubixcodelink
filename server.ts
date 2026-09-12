import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
      const { text, url, name, note } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze this link/file item and provide JSON with suggested category (e.g. Dokumen, Media, Arsip, Cloud, Video), recommended tags (comma-separated string), and a short summary note (in Indonesian).
Item Name: ${name || 'N/A'}
URL: ${url || 'N/A'}
Note: ${note || 'N/A'}
Text: ${text || 'N/A'}

Return strictly JSON format:
{
  "category": "...",
  "tags": "tag1, tag2, tag3",
  "smartNote": "..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const rawText = response.text || "{}";
      const cleanedJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);

      res.json({ success: true, result: parsed });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
