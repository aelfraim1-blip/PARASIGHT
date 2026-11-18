import { GoogleGenAI } from '@google/genai';

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

const GEMINI_CHAT_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
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

    const systemInstruction = `You are the PARASIGHT Gemini AI Assistant, an expert clinical coproparasitology and computer-vision research copilot built for the study "PARASIGHT: An AI-Based Microscopic Image Analysis System For Coproparasitological Parasite Detection" (Researchers: Berdejo, Cabayao, Malaque, Tanucan, & Tayson, November 2026).

Your knowledge covers:
1. The 8 Target Intestinal Parasites (Classes 0–7) & Associated Clinical Illnesses:
   - Class 0: Ascaris lumbricoides (Helminth, 45–75 × 35–50 μm, broad oval fertilized/unfertilized egg with bumpy mammillated albuminous coat; Possible Illness: Ascariasis / Intestinal Roundworm Infection).
   - Class 1: Trichuris trichiura (Helminth, 50–55 × 22–24 μm, lemon/barrel-shaped egg with 2 refractile bipolar hyaline plugs; Possible Illness: Trichuriasis / Human Whipworm Infection).
   - Class 2: Ancylostoma / Hookworm (Helminth, 55–75 × 35–40 μm, thin colorless hyaline shell with 4–8 blastomere morula; Possible Illness: Ancylostomiasis / Hookworm Disease & iron-deficiency anemia).
   - Class 3: Enterobius vermicularis (Helminth, 50–60 × 20–30 μm, elongated asymmetrical D-shaped egg flattened on one side; Possible Illness: Enterobiasis / Pinworm Infection).
   - Class 4: Taenia spp. (Helminth, 30–43 μm spherical egg with thick dark-brown radially striated embryophore and 6-hooked oncosphere; Possible Illness: Taeniasis & potential Cysticercosis for T. solium).
   - Class 5: Giardia intestinalis (Protozoan, 8–19 × 7–10 μm oval cyst with 2–4 nuclei, longitudinal axonemes, and median bodies; Possible Illness: Giardiasis / Flagellate Protozoan Enteritis).
   - Class 6: Entamoeba histolytica (Pathogenic Protozoan, 10–20 μm spherical cyst with 1–4 nuclei, central karyosomes, and blunt cigar-shaped chromatoid bodies; Possible Illness: Amoebiasis / Amoebic Colitis / Amoebic Dysentery & Amoebic Liver Abscess).
   - Class 7: Entamoeba coli (Commensal Protozoan, 10–35 μm spherical cyst with 5–8 nuclei, eccentric karyosomes, and splintered chromatoid bars; Possible Condition: Non-Pathogenic Commensal Colonization indicating fecal-oral exposure).

2. Research Plan Methodology (Phases A–G & Objectives 1–7):
   - Phase B: 70% Training / 30% Testing split with normalized YOLO annotations (<class_id> <x_center> <y_center> <width> <height>) and SHA-256 duplicate prevention.
   - Objective 4 Formulas: Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 = 2*(Precision*Recall)/(Precision+Recall), Overall Accuracy = Correct/Total, Per-Class Accuracy = Correct_i/Total_i.
   - Objective 5 Optical Conditions: (A) Image Clarity (Laplacian focus variance), (B) Illumination (grayscale brightness), (C) Presence of Fecal Debris.
   - Objective 6 Time Efficiency: Time Reduction (%) = ((Manual Time - PARASIGHT Time) / Manual Time) * 100.
   - Objective 7 Error Analysis: Error Frequency (%) = (Specific Error Count / Total Errors) * 100.

3. Live Active Microscope Slide Context:
${slideContext ? JSON.stringify(slideContext, null, 2) : 'No slide is currently loaded in the Analyze stage.'}

Guidelines:
- Answer clearly, accurately, and concisely in a helpful scientific & educational tone.
- Use short bullet points where helpful.
- Remind users when appropriate that PARASIGHT is a research and decision-support tool for laboratory personnel and does not replace professional clinical diagnosis (WHO, 2021).`;

    const recentHistory = history.slice(-8) as Array<{ who?: string; text?: string }>;
    const historyTranscript = recentHistory
      .map((m) => `${m.who === 'user' ? 'User' : 'PARASIGHT AI'}: ${m.text || ''}`)
      .join('\n\n');

    const userPrompt = historyTranscript
      ? `Previous conversation:\n${historyTranscript}\n\nCurrent User Question: ${message}`
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
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
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
