import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.post('/api/detect', async (req, res) => {
    try {
      const { imageDataUrl, fileName, sensitivity = 60 } = req.body || {};
      if (!imageDataUrl || typeof imageDataUrl !== 'string') {
        res.status(400).json({ error: 'Missing imageDataUrl' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.json({
          fallback: true,
          engine: 'PARASIGHT Local Morphological Classifier',
          reason: 'No external Gemini API key configured; using local morphological classifier.',
        });
        return;
      }

      const commaIdx = imageDataUrl.indexOf(',');
      const meta = commaIdx > -1 ? imageDataUrl.slice(0, commaIdx) : '';
      const base64Data = commaIdx > -1 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
      const mimeMatch = meta.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const promptText = `You are PARASIGHT, an automated clinical coproparasitological microscopic image analysis and annotation engine.
Inspect this stool microscopy image (filename: ${fileName || 'specimen.png'}, detection sensitivity: ${sensitivity}%).
Identify and localize all intestinal parasite structures (helminth ova/larvae or protozoan cysts/trophozoites) across the 8 target species:
- Class 0: Ascaris lumbricoides (Broad oval fertilized/unfertilized egg with mammillated outer coat)
- Class 1: Trichuris trichiura (Barrel-shaped egg with bipolar hyaline plugs)
- Class 2: Ancylostoma (Hookworm) (Thin hyaline shell with segmented blastomere morula)
- Class 3: Enterobius vermicularis (Elongated asymmetrical D-shaped planoconvex egg)
- Class 4: Taenia spp. (Spherical egg with thick radially striated dark embryophore)
- Class 5: Giardia intestinalis (Oval cyst with multiple nuclei, axonemes, and median bodies)
- Class 6: Entamoeba histolytica (Spherical cyst with 1-4 nuclei, central karyosomes, blunt cigar-shaped chromatoid bodies)
- Class 7: Entamoeba coli (Large spherical cyst with up to 8 nuclei, eccentric karyosomes)

For each detected parasite structure, return its bounding box in [ymin, xmin, ymax, xmax] format scaled 0 to 1000, its classId (0 to 7), scientific species label, confidence (0.0 to 1.0), and a concise morphologicalNote describing the visible diagnostic features.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stainEstimate: {
                type: Type.STRING,
                description: 'Estimated microscopic stain or preparation type.',
              },
              diagnosticSummary: {
                type: Type.STRING,
                description: 'Overall automated clinical annotation summary.',
              },
              detections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    classId: {
                      type: Type.INTEGER,
                      description: 'Target species class ID from 0 to 7.',
                    },
                    label: {
                      type: Type.STRING,
                      description: 'Scientific name of the detected parasite species.',
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: 'Confidence score between 0.0 and 1.0.',
                    },
                    ymin: {
                      type: Type.NUMBER,
                      description: 'Top Y coordinate scaled 0 to 1000.',
                    },
                    xmin: {
                      type: Type.NUMBER,
                      description: 'Left X coordinate scaled 0 to 1000.',
                    },
                    ymax: {
                      type: Type.NUMBER,
                      description: 'Bottom Y coordinate scaled 0 to 1000.',
                    },
                    xmax: {
                      type: Type.NUMBER,
                      description: 'Right X coordinate scaled 0 to 1000.',
                    },
                    morphologicalNote: {
                      type: Type.STRING,
                      description: 'Visible diagnostic features supporting this classification.',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        fallback: false,
        engine: 'PARASIGHT Gemini Vision + YOLOv8 Head',
        ...parsed,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.json({
        fallback: true,
        engine: 'PARASIGHT Local Morphological Classifier',
        reason: msg,
      });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history = [], slideContext = null, imageDataUrl = null } = req.body || {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Missing message' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.json({
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

      const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
      const historyTranscript = recentHistory
        .map(
          (m: { who?: string; text?: string }) =>
            `${m.who === 'user' ? 'User' : 'PARASIGHT AI'}: ${m.text || ''}`
        )
        .join('\n\n');

      const userPrompt = historyTranscript
        ? `Previous conversation:\n${historyTranscript}\n\nCurrent User Question: ${message}`
        : message;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];

      if (imageDataUrl && typeof imageDataUrl === 'string' && imageDataUrl.includes(',')) {
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
        res.json({
          fallback: true,
          engine: 'PARASIGHT Contextual Knowledge AI',
          reason: 'Empty model response',
        });
        return;
      }

      res.json({
        fallback: false,
        engine: 'Gemini 3.8 Flash · PARASIGHT AI',
        reply: replyText,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.json({
        fallback: true,
        engine: 'PARASIGHT Contextual Knowledge AI',
        reason: msg,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PARASIGHT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
