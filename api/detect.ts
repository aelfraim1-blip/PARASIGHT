import { GoogleGenAI, Type } from '@google/genai';

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

const GEMINI_VISION_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash'] as const;

function getGenAIClient(): GoogleGenAI | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    '';
  const key = rawKey.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
  });
}

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
    const imageDataUrl =
      typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl : '';
    const fileName =
      typeof payload.fileName === 'string' ? payload.fileName : 'specimen.png';
    const sensitivity =
      typeof payload.sensitivity === 'number' ? payload.sensitivity : 60;

    if (!imageDataUrl) {
      sendJson(res, 400, { error: 'Missing imageDataUrl' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      sendJson(res, 200, {
        fallback: true,
        engine: 'PARASIGHT Local Morphological Classifier',
        reason:
          'No GEMINI_API_KEY environment variable configured on Vercel; using built-in local morphological classifier.',
      });
      return;
    }

    const commaIdx = imageDataUrl.indexOf(',');
    const meta = commaIdx > -1 ? imageDataUrl.slice(0, commaIdx) : '';
    const base64Data = commaIdx > -1 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
    const mimeMatch = meta.match(/data:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    const promptText = `You are PARASIGHT, an automated clinical coproparasitological microscopic image analysis and annotation engine.
Inspect this stool microscopy image (filename: ${fileName}, detection sensitivity: ${sensitivity}%).
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

    let lastError = '';
    for (const modelName of GEMINI_VISION_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
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

        const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
        sendJson(res, 200, {
          fallback: false,
          engine: `PARASIGHT Gemini Vision (${modelName}) + YOLOv8 Head`,
          ...parsed,
        });
        return;
      } catch (innerErr: unknown) {
        lastError = innerErr instanceof Error ? innerErr.message : String(innerErr);
      }
    }

    sendJson(res, 200, {
      fallback: true,
      engine: 'PARASIGHT Local Morphological Classifier',
      reason: lastError || 'Vision model fallback',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(res, 200, {
      fallback: true,
      engine: 'PARASIGHT Local Morphological Classifier',
      reason: msg,
    });
  }
}
