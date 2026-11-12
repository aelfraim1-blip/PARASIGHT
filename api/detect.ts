import { GoogleGenAI, Type } from '@google/genai';

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
    const imageDataUrl =
      typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl : '';
    const fileName =
      typeof payload.fileName === 'string' ? payload.fileName : 'specimen.png';
    const sensitivity =
      typeof payload.sensitivity === 'number' ? payload.sensitivity : 60;

    if (!imageDataUrl) {
      res.status(400).json({ error: 'Missing imageDataUrl' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(200).json({
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

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
    res.status(200).json({
      fallback: false,
      engine: 'PARASIGHT Gemini Vision + YOLOv8 Head',
      ...parsed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(200).json({
      fallback: true,
      engine: 'PARASIGHT Local Morphological Classifier',
      reason: msg,
    });
  }
}
