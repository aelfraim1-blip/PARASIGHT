import { GoogleGenAI, ThinkingLevel } from '@google/genai';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
  json?: () => Promise<unknown>;
  on?: (event: string, listener: (chunk?: unknown) => void) => void;
}

interface VercelResponseLike {
  statusCode?: number;
  status?: (code: number) => { json?: (data: unknown) => void };
  json?: (data: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (chunk?: string) => void;
}

// Ordered so the fastest public & AI Studio Flash models succeed on the VERY FIRST request without 404 retry delays
const GEMINI_CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
] as const;

function sendJson(res: VercelResponseLike, statusCode: number, data: unknown) {
  if (typeof res.status === 'function') {
    const chained = res.status(statusCode);
    if (chained && typeof chained.json === 'function') {
      chained.json(data);
      return;
    }
  }
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.statusCode = statusCode;
  if (typeof res.end === 'function') {
    res.end(JSON.stringify(data));
  }
}

async function readRequestBody(req: VercelRequestLike): Promise<Record<string, unknown>> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') {
      return req.body as Record<string, unknown>;
    }
  }
  if (typeof req.json === 'function') {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }
  if (typeof req.on === 'function') {
    const raw = await new Promise<string>((resolve) => {
      let data = '';
      req.on!('data', (chunk: unknown) => {
        data += String(chunk ?? '');
      });
      req.on!('end', () => resolve(data));
      req.on!('error', () => resolve(''));
    });
    if (raw) {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
  }
  return {};
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const payload = await readRequestBody(req);
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const history = Array.isArray(payload.history) ? payload.history : [];
    const slideContext = payload.slideContext ?? null;
    const imageDataUrl =
      typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl : null;

    if (!message) {
      sendJson(res, 400, { error: 'Missing message' });
      return;
    }

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      ''
    ).trim();

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      sendJson(res, 500, {
        error:
          'GEMINI_API_KEY is not configured on the server. On Vercel, add GEMINI_API_KEY in Project Settings → Environment Variables and redeploy.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const compactSlideInfo = slideContext
      ? `Active Slide: ${JSON.stringify(slideContext)}`
      : 'Active Slide: None currently loaded.';

    const systemInstruction = `You are the PARASIGHT Gemini AI Assistant for "PARASIGHT: An AI-Based Microscopic Image Analysis System For Coproparasitological Parasite Detection".
8 Target Parasites (Classes 0-7) & Associated Illnesses:
- C0 Ascaris lumbricoides: Helminth egg (45-75×35-50μm), oval with bumpy mammillated coat. Illness: Ascariasis.
- C1 Trichuris trichiura: Helminth egg (50-55×22-24μm), barrel-shaped with 2 bipolar hyaline plugs. Illness: Trichuriasis.
- C2 Ancylostoma (Hookworm): Helminth ovum (55-75×35-40μm), thin hyaline shell with 4-8 cell morula. Illness: Ancylostomiasis / Hookworm anemia.
- C3 Enterobius vermicularis: Helminth egg (50-60×20-30μm), flattened D-shape. Illness: Enterobiasis (Pinworm).
- C4 Taenia spp.: Helminth egg (30-43μm), spherical with thick dark radially striated embryophore. Illness: Taeniasis / Cysticercosis.
- C5 Giardia intestinalis: Protozoan cyst (8-19×7-10μm), oval with 2-4 nuclei & axonemes. Illness: Giardiasis.
- C6 Entamoeba histolytica: Pathogenic protozoan cyst (10-20μm), 1-4 nuclei, central karyosome, blunt cigar chromatoid bars. Illness: Amoebiasis / Amoebic dysentery.
- C7 Entamoeba coli: Commensal protozoan cyst (10-35μm), 5-8 nuclei, eccentric karyosome, splintered chromatoid bars. Condition: Non-pathogenic commensal colonization.
Methodology: Phase B 70/30 YOLO train/test split; Precision=TP/(TP+FP), Recall=TP/(TP+FN), F1=2PR/(P+R), Time Reduction=((Manual-PARASIGHT)/Manual)*100.
${compactSlideInfo}
Keep answers fast, concise, and clear (2-5 short bullet points or 1-2 brief paragraphs unless asked for more).`;

    const recentHistory = history.slice(-4) as Array<{ who?: string; text?: string }>;
    const historyTranscript = recentHistory
      .map((m) => `${m.who === 'user' ? 'User' : 'AI'}: ${m.text || ''}`)
      .join('\n');

    const userPrompt = historyTranscript
      ? `${historyTranscript}\nUser: ${message}`
      : message;

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (imageDataUrl && imageDataUrl.includes(',')) {
      const commaIdx = imageDataUrl.indexOf(',');
      const meta = imageDataUrl.slice(0, commaIdx);
      const base64Data = imageDataUrl.slice(commaIdx + 1);
      const mimeMatch = meta.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    parts.push({ text: userPrompt });

    let lastErrorMsg = '';
    for (const modelName of GEMINI_CHAT_MODELS) {
      try {
        // Disable thinking budget on 2.5-flash/flash-latest or use LOW thinking level on Gemini 3/4 for sub-second response latency
        const isGemini3Or4 =
          modelName.startsWith('gemini-3') || modelName.startsWith('gemini-4');
        const thinkingConfig = isGemini3Or4
          ? { thinkingLevel: ThinkingLevel.LOW }
          : { thinkingBudget: 0 };

        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            thinkingConfig,
          },
        });

        const replyText = (response.text ?? '').trim();
        if (replyText) {
          sendJson(res, 200, {
            engine: `Google Gemini AI (${modelName})`,
            reply: replyText,
          });
          return;
        }
      } catch (innerErr: unknown) {
        lastErrorMsg =
          innerErr instanceof Error ? innerErr.message : String(innerErr);
      }
    }

    sendJson(res, 502, {
      error: `Gemini API generation failed: ${lastErrorMsg || 'Empty response from Gemini model.'}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, {
      error: `Gemini API error: ${msg}`,
    });
  }
}
