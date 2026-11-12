import { GoogleGenAI } from '@google/genai';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (data: unknown) => void;
  setHeader?: (name: string, value: string) => void;
}

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
  });
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const payload = parseBody(req.body);
    const message = typeof payload.message === 'string' ? payload.message : '';
    const history = Array.isArray(payload.history) ? payload.history : [];
    const slideContext = payload.slideContext ?? null;
    const imageDataUrl =
      typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl : null;

    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(200).json({
        fallback: true,
        engine: 'PARASIGHT Contextual Knowledge AI',
        reason: 'No external Gemini API key configured; using contextual knowledge AI.',
      });
      return;
    }

    const systemInstruction = `You are the PARASIGHT AI Assistant, an expert clinical coproparasitology and computer-vision research copilot built for the study "PARASIGHT: An AI-Based Microscopic Image Analysis System For Coproparasitological Parasite Detection" (Researchers: Berdejo, Cabayao, Malaque, Tanucan, & Tayson, November 2026).

Your knowledge covers:
1. The 8 Target Intestinal Parasites (Classes 0–7):
   - Class 0: Ascaris lumbricoides (Helminth, 45–75 × 35–50 μm, broad oval fertilized/unfertilized egg with bumpy mammillated albuminous coat, golden-brown in iodine/bile).
   - Class 1: Trichuris trichiura (Helminth, 50–55 × 22–24 μm, lemon/barrel-shaped egg with 2 refractile bipolar hyaline plugs).
   - Class 2: Ancylostoma / Hookworm (Helminth, 55–75 × 35–40 μm, thin colorless hyaline shell with 4–8 blastomere morula and clear space).
   - Class 3: Enterobius vermicularis (Helminth, 50–60 × 20–30 μm, elongated asymmetrical D-shaped flattened on one side, double-layered shell).
   - Class 4: Taenia spp. (Helminth, 30–43 μm spherical egg with thick dark-brown radially striated embryophore and 6-hooked oncosphere).
   - Class 5: Giardia intestinalis (Protozoan, 8–19 × 7–10 μm oval cyst with 2–4 nuclei, longitudinal axonemes, and median bodies).
   - Class 6: Entamoeba histolytica (Pathogenic Protozoan, 10–20 μm spherical cyst with 1–4 nuclei, central karyosomes, and cigar-shaped chromatoid bodies with blunt ends).
   - Class 7: Entamoeba coli (Commensal Protozoan, 10–35 μm spherical cyst with 5–8 nuclei, eccentric karyosomes, and splintered chromatoid bars).

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
      .map(
        (m) => `${m.who === 'user' ? 'User' : 'PARASIGHT AI'}: ${m.text || ''}`
      )
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
      },
    });

    const replyText = (response.text ?? '').trim();
    if (!replyText) {
      res.status(200).json({
        fallback: true,
        engine: 'PARASIGHT Contextual Knowledge AI',
        reason: 'Empty model response',
      });
      return;
    }

    res.status(200).json({
      fallback: false,
      engine: 'Gemini 3.8 Flash · PARASIGHT AI',
      reply: replyText,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(200).json({
      fallback: true,
      engine: 'PARASIGHT Contextual Knowledge AI',
      reason: msg,
    });
  }
}
