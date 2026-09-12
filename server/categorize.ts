import { GoogleGenAI } from '@google/genai';

export interface CategorizeInput {
  text?: string;
  url?: string;
  name?: string;
  note?: string;
}

export interface CategorizeResult {
  category: string;
  tags: string;
  smartNote: string;
}

/**
 * Shared AI categorization logic, used by both the local/Node Express
 * server (server.ts) and the Vercel serverless function (api/ai/categorize.ts)
 * so the two entry points never drift out of sync.
 */
export async function runCategorization(input: CategorizeInput): Promise<CategorizeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const { text, url, name, note } = input;
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

  const rawText = response.text || '{}';
  const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedJson) as CategorizeResult;
}
