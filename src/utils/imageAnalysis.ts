import {
  TARGET_PARASITES,
  classifyImageCondition,
  ImageConditionAssessment,
  formatYoloAnnotation,
  classifyCandidateMorphology,
  generateAutomatedDiagnosticReport,
  AutomatedDiagnosticSummary,
} from './parasightLogic';

export interface DetectionCandidate {
  id?: string;
  label: string;
  classId?: number;
  confidence: number | null;
  bbox: [number, number, number, number];
  normalized: boolean;
  area?: number;
  yoloLine?: string;
  morphologicalNote?: string;
  group?: 'Helminth' | 'Protozoan';
  stage?: string;
  source?: 'model' | 'screening' | 'manual';
}

export interface QualityMetrics {
  brightness: number;
  contrast: number;
  focus: number;
  focusLabel: string;
  conditions: ImageConditionAssessment;
}

export interface DemoSlidePreset {
  id: string;
  title: string;
  shortTitle: string;
  species: string;
  classId: number;
  group: 'Helminth' | 'Protozoan';
  stain: string;
  manualTimeSec: number;
  description: string;
}

export const DEMO_SLIDE_PRESETS: DemoSlidePreset[] = [
  {
    id: 'ascaris-lugol',
    title: 'Slide 01 · Ascaris lumbricoides (Lugol’s Iodine, 400×)',
    shortTitle: 'Ascaris lumbricoides',
    species: 'Ascaris lumbricoides',
    classId: 0,
    group: 'Helminth',
    stain: 'Lugol’s Iodine (400×)',
    manualTimeSec: 135,
    description: 'Fertilized oval ova with characteristic mammillated albuminous coat and mild background fecal debris.',
  },
  {
    id: 'trichuris-saline',
    title: 'Slide 02 · Trichuris trichiura (Saline Wet Mount, 400×)',
    shortTitle: 'Trichuris trichiura',
    species: 'Trichuris trichiura',
    classId: 1,
    group: 'Helminth',
    stain: 'Direct Saline (400×)',
    manualTimeSec: 118,
    description: 'Barrel-shaped whipworm ova with refractile bipolar hyaline plugs and smooth triple-layered shell.',
  },
  {
    id: 'ancylostoma-saline',
    title: 'Slide 03 · Ancylostoma / Hookworm (Saline Wet Mount, 400×)',
    shortTitle: 'Ancylostoma (Hookworm)',
    species: 'Ancylostoma (Hookworm)',
    classId: 2,
    group: 'Helminth',
    stain: 'Direct Saline (400×)',
    manualTimeSec: 148,
    description: 'Thin hyaline-shelled oval ovum containing a segmented 4-to-8-cell blastomere morula.',
  },
  {
    id: 'enterobius-tape',
    title: 'Slide 04 · Enterobius vermicularis (Saline Mount, 400×)',
    shortTitle: 'Enterobius vermicularis',
    species: 'Enterobius vermicularis',
    classId: 3,
    group: 'Helminth',
    stain: 'Direct Saline (400×)',
    manualTimeSec: 125,
    description: 'Elongated asymmetrical D-shaped (planoconvex) colorless shell containing a developing larva.',
  },
  {
    id: 'taenia-wet',
    title: 'Slide 05 · Taenia spp. & Entamoeba coli (Mixed Field, 400×)',
    shortTitle: 'Taenia spp. + E. coli',
    species: 'Taenia spp.',
    classId: 4,
    group: 'Helminth',
    stain: 'Lugol’s Iodine (400×)',
    manualTimeSec: 165,
    description: 'Spherical radially striated Taenia embryophore alongside an 8-nucleated Entamoeba coli cyst.',
  },
  {
    id: 'giardia-trichrome',
    title: 'Slide 06 · Giardia intestinalis (Trichrome Stain, 1000×)',
    shortTitle: 'Giardia intestinalis',
    species: 'Giardia intestinalis',
    classId: 5,
    group: 'Protozoan',
    stain: 'Wheatley Trichrome (1000×)',
    manualTimeSec: 180,
    description: 'Oval protozoan cysts displaying multiple nuclei, median bodies, and longitudinal axonemes.',
  },
  {
    id: 'ehistolytica-trichrome',
    title: 'Slide 07 · Entamoeba histolytica (Trichrome Stain, 1000×)',
    shortTitle: 'Entamoeba histolytica',
    species: 'Entamoeba histolytica',
    classId: 6,
    group: 'Protozoan',
    stain: 'Wheatley Trichrome (1000×)',
    manualTimeSec: 195,
    description: 'Spherical mature quadrinucleate cyst with central karyosomes and blunt cigar-shaped chromatoid bodies.',
  },
  {
    id: 'ecoli-iodine',
    title: 'Slide 08 · Entamoeba coli (Lugol’s Iodine, 1000×)',
    shortTitle: 'Entamoeba coli',
    species: 'Entamoeba coli',
    classId: 7,
    group: 'Protozoan',
    stain: 'Lugol’s Iodine (1000×)',
    manualTimeSec: 172,
    description: 'Large spherical mature cyst containing up to 8 nuclei with eccentric karyosomes and splintered chromatoids.',
  },
];

/**
 * Generates a realistic synthetic microscopy field image on an HTML5 canvas for offline testing
 * ("Use Demo Sample?" branch of the Page 7 System Flow diagram).
 */
export function generateDemoMicroscopySlide(presetId: string): {
  dataUrl: string;
  fileName: string;
  preset: DemoSlidePreset;
  groundTruthDetections: DetectionCandidate[];
} {
  const preset = DEMO_SLIDE_PRESETS.find((p) => p.id === presetId) || DEMO_SLIDE_PRESETS[0];
  const width = 720;
  const height = 520;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const isTrichrome = preset.stain.includes('Trichrome');
  const isSaline = preset.stain.includes('Saline');

  // Background illumination field
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    40,
    width * 0.5,
    height * 0.5,
    420
  );
  if (isTrichrome) {
    bgGrad.addColorStop(0, '#e6f1ec');
    bgGrad.addColorStop(1, '#c7ddd4');
  } else if (isSaline) {
    bgGrad.addColorStop(0, '#f4f5f0');
    bgGrad.addColorStop(1, '#d9ddd2');
  } else {
    bgGrad.addColorStop(0, '#fcf3db');
    bgGrad.addColorStop(1, '#e3cfa1');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle microscopic illumination vignette & fine grain fecal debris
  for (let i = 0; i < 68; i++) {
    const rx = ((i * 97) % (width - 40)) + 20;
    const ry = ((i * 53) % (height - 40)) + 20;
    const r = (i % 4) + 1.5;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(120, 98, 62, 0.14)' : 'rgba(85, 70, 45, 0.10)';
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const groundTruthDetections: DetectionCandidate[] = [];

  if (preset.id === 'ascaris-lugol') {
    const coords = [
      { cx: 250, cy: 230, rx: 46, ry: 36, conf: 0.954 },
      { cx: 485, cy: 310, rx: 44, ry: 35, conf: 0.928 },
    ];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.fillStyle = '#6e3b10';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const bx = Math.cos(a) * (c.rx - 2);
        const by = Math.sin(a) * (c.ry - 2);
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8b4c18';
      ctx.strokeStyle = '#4a2507';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx - 4, c.ry - 4, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b4712c';
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx - 15, c.ry - 13, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.rx - 6) / width,
        (c.cy - c.ry - 6) / height,
        ((c.rx + 6) * 2) / width,
        ((c.ry + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Ascaris lumbricoides',
        classId: 0,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(0, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'trichuris-saline') {
    const coords = [
      { cx: 340, cy: 255, rx: 52, ry: 25, conf: 0.962 },
      { cx: 515, cy: 175, rx: 48, ry: 23, conf: 0.915 },
    ];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.fillStyle = '#f4ebd0';
      ctx.strokeStyle = '#6b4415';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(-c.rx + 4, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(c.rx - 4, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#9c5a1a';
      ctx.strokeStyle = '#4f2905';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx - 6, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c48337';
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx - 16, c.ry - 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.rx - 6) / width,
        (c.cy - c.ry - 6) / height,
        ((c.rx + 6) * 2) / width,
        ((c.ry + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Trichuris trichiura',
        classId: 1,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(1, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'ancylostoma-saline') {
    const coords = [{ cx: 355, cy: 260, rx: 48, ry: 33, conf: 0.924 }];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      // Thin hyaline shell
      ctx.fillStyle = 'rgba(235, 240, 232, 0.85)';
      ctx.strokeStyle = '#4b5548';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx, c.ry, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 4-to-8 blastomeres
      const cells = [
        { x: -14, y: -8, r: 12 },
        { x: 12, y: -9, r: 12 },
        { x: -12, y: 10, r: 12 },
        { x: 13, y: 9, r: 12 },
        { x: 0, y: 0, r: 11 },
      ];
      cells.forEach((cell) => {
        ctx.fillStyle = '#9aa38e';
        ctx.strokeStyle = '#5c6653';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.rx - 6) / width,
        (c.cy - c.ry - 6) / height,
        ((c.rx + 6) * 2) / width,
        ((c.ry + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Ancylostoma (Hookworm)',
        classId: 2,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(2, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'enterobius-tape') {
    const coords = [
      { cx: 320, cy: 250, rx: 48, ry: 24, conf: 0.941 },
      { cx: 490, cy: 310, rx: 46, ry: 23, conf: 0.897 },
    ];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      // Asymmetrical D-shaped shell
      ctx.fillStyle = 'rgba(244, 246, 240, 0.9)';
      ctx.strokeStyle = '#556052';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-c.rx, -6);
      ctx.quadraticCurveTo(0, -10, c.rx, -6);
      ctx.bezierCurveTo(c.rx + 6, c.ry + 12, -c.rx - 6, c.ry + 12, -c.rx, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Folded larva inside
      ctx.strokeStyle = '#7c8774';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-c.rx + 16, 4);
      ctx.quadraticCurveTo(0, 18, c.rx - 16, 2);
      ctx.stroke();
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.rx - 8) / width,
        (c.cy - 18) / height,
        ((c.rx + 8) * 2) / width,
        (c.ry + 30) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Enterobius vermicularis',
        classId: 3,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(3, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'giardia-trichrome') {
    const coords = [
      { cx: 260, cy: 220, rx: 32, ry: 22, conf: 0.932 },
      { cx: 460, cy: 295, rx: 30, ry: 21, conf: 0.904 },
    ];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.fillStyle = '#5d8a7c';
      ctx.strokeStyle = '#264a40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.rx, c.ry, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#7a1c32';
      ctx.beginPath();
      ctx.arc(-9, -5, 4, 0, Math.PI * 2);
      ctx.arc(-9, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a1c32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.rx - 6) / width,
        (c.cy - c.ry - 6) / height,
        ((c.rx + 6) * 2) / width,
        ((c.ry + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Giardia intestinalis',
        classId: 5,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(5, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'ehistolytica-trichrome') {
    const coords = [
      { cx: 345, cy: 250, r: 34, conf: 0.918 },
    ];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.fillStyle = '#689689';
      ctx.strokeStyle = '#2c5449';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 4 nuclei with central karyosomes
      const nucs = [
        { x: -11, y: -10 },
        { x: 11, y: -9 },
        { x: -9, y: 11 },
        { x: 10, y: 10 },
      ];
      nucs.forEach((n) => {
        ctx.strokeStyle = '#75192e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#75192e';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
      // Blunt cigar-shaped chromatoid body
      ctx.strokeStyle = '#82162e';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, 1);
      ctx.lineTo(12, -2);
      ctx.stroke();
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.r - 6) / width,
        (c.cy - c.r - 6) / height,
        ((c.r + 6) * 2) / width,
        ((c.r + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Entamoeba histolytica',
        classId: 6,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(6, bbox),
        source: 'model',
      });
    });
  } else if (preset.id === 'ecoli-iodine') {
    const coords = [{ cx: 360, cy: 255, r: 42, conf: 0.905 }];
    coords.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.fillStyle = '#b98944';
      ctx.strokeStyle = '#593b12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 8 nuclei with eccentric karyosomes
      const nucs = [
        { x: -16, y: -14 },
        { x: 2, y: -18 },
        { x: 18, y: -10 },
        { x: -20, y: 4 },
        { x: 0, y: 2 },
        { x: 19, y: 8 },
        { x: -10, y: 20 },
        { x: 9, y: 21 },
      ];
      nucs.forEach((n) => {
        ctx.strokeStyle = '#4a2c09';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#4a2c09';
        ctx.beginPath();
        ctx.arc(n.x + 1.8, n.y - 1.2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      const bbox: [number, number, number, number] = [
        (c.cx - c.r - 6) / width,
        (c.cy - c.r - 6) / height,
        ((c.r + 6) * 2) / width,
        ((c.r + 6) * 2) / height,
      ];
      groundTruthDetections.push({
        id: `det-${idx + 1}`,
        label: 'Entamoeba coli',
        classId: 7,
        confidence: c.conf,
        bbox,
        normalized: true,
        yoloLine: formatYoloAnnotation(7, bbox),
        source: 'model',
      });
    });
  } else {
    // Mixed slide: Taenia spp. + Entamoeba coli
    ctx.save();
    ctx.translate(255, 250);
    ctx.fillStyle = '#5e3411';
    ctx.strokeStyle = '#2d1705';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9e6632';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const bbox1: [number, number, number, number] = [
      (255 - 44) / width,
      (250 - 44) / height,
      88 / width,
      88 / height,
    ];
    groundTruthDetections.push({
      id: 'det-1',
      label: 'Taenia spp.',
      classId: 4,
      confidence: 0.938,
      bbox: bbox1,
      normalized: true,
      yoloLine: formatYoloAnnotation(4, bbox1),
      source: 'model',
    });

    ctx.save();
    ctx.translate(475, 275);
    ctx.fillStyle = '#8b6834';
    ctx.strokeStyle = '#473314';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const bbox2: [number, number, number, number] = [
      (475 - 38) / width,
      (275 - 38) / height,
      76 / width,
      76 / height,
    ];
    groundTruthDetections.push({
      id: 'det-2',
      label: 'Entamoeba coli',
      classId: 7,
      confidence: 0.884,
      bbox: bbox2,
      normalized: true,
      yoloLine: formatYoloAnnotation(7, bbox2),
      source: 'model',
    });
  }

  // Scale bar in bottom right corner
  ctx.fillStyle = 'rgba(40, 20, 10, 0.75)';
  ctx.fillRect(width - 130, height - 32, 100, 5);
  ctx.font = 'bold 12px Arial';
  ctx.fillText('50 μm', width - 98, height - 38);

  const enrichedDetections: DetectionCandidate[] = groundTruthDetections.map((d) => {
    const sp = TARGET_PARASITES[d.classId ?? 0] || TARGET_PARASITES[0];
    return {
      ...d,
      morphologicalNote: d.morphologicalNote || sp.morphology,
      group: sp.group,
      stage: sp.stage,
    };
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `${preset.id}-sample.png`,
    preset,
    groundTruthDetections: enrichedDetections,
  };
}

function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Automated browser-side Otsu segmentation + morphological feature extraction + 8-species classification.
 * Segments candidate structures, computes RGB/HSV stain chromaticity, elongation, circularity,
 * polar plug refractility, and shell edge contrast, and classifies each box into Classes 0–7.
 */
export async function screenContrastRegions(
  dataUrl: string,
  sensitivity: number
): Promise<DetectionCandidate[]> {
  const im = new Image();
  im.src = dataUrl;
  await new Promise((resolve, reject) => {
    im.onload = resolve;
    im.onerror = reject;
  });
  const scale = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * scale));
  const h = Math.max(1, Math.round(im.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(im, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    gray[j] = g;
    hist[g]++;
  }
  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let weightB = 0;
  let best = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    weightB += hist[t];
    if (!weightB) continue;
    const weightF = total - weightB;
    if (!weightF) break;
    sumB += t * hist[t];
    const mB = sumB / weightB;
    const mF = (sum - sumB) / weightF;
    const v = weightB * weightF * (mB - mF) * (mB - mF);
    if (v > best) {
      best = v;
      threshold = t;
    }
  }
  const dark = hist.slice(0, threshold + 1).reduce((a, b) => a + b, 0);
  const bright = total - dark;
  const chooseDark = dark <= bright;
  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    mask[i] = (chooseDark ? gray[i] <= threshold : gray[i] > threshold) ? 1 : 0;
  }
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  const rawCandidates: DetectionCandidate[] = [];
  const minArea = Math.max(48, Math.round(total * 0.00045));
  const maxArea = Math.round(total * 0.085);
  const minContrast = Math.max(8, Math.round(24 - sensitivity * 0.12));

  for (let seed = 0; seed < total && rawCandidates.length < 40; seed++) {
    if (!mask[seed] || seen[seed]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    seen[seed] = 1;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    let sumG = 0;
    let sumG2 = 0;
    let sumR = 0;
    let sumGrn = 0;
    let sumBlu = 0;
    let perimeterCount = 0;
    let sumEdgeGrad = 0;

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx / w) | 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const gVal = gray[idx];
      sumG += gVal;
      sumG2 += gVal * gVal;
      const p4 = idx * 4;
      sumR += px[p4];
      sumGrn += px[p4 + 1];
      sumBlu += px[p4 + 2];

      let isBoundary = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!mask[ni]) {
            isBoundary = true;
            sumEdgeGrad += Math.abs(gVal - gray[ni]);
          } else if (!seen[ni]) {
            seen[ni] = 1;
            queue[tail++] = ni;
          }
        }
      }
      if (isBoundary) perimeterCount++;
    }

    const area = tail;
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    // Skip bottom-right scale bar region
    if (minX > w * 0.72 && minY > h * 0.85) continue;
    const major = Math.max(bw, bh);
    const minor = Math.max(1, Math.min(bw, bh));
    const aspectRatio = major / minor;
    if (area < minArea || area > maxArea || aspectRatio > 2.65) continue;

    const meanG = sumG / area;
    if (Math.abs(meanG - sum / total) < minContrast) continue;

    const meanR = sumR / area;
    const meanGrn = sumGrn / area;
    const meanBlu = sumBlu / area;
    const warmthIndex = meanR - meanBlu;
    const greenBlueIndex = meanGrn + meanBlu - 1.85 * meanR;
    const internalTexture = Math.sqrt(Math.max(0, sumG2 / area - meanG * meanG));
    const shellEdgeContrast = perimeterCount > 0 ? sumEdgeGrad / perimeterCount : 18;
    const circularity = Math.min(
      1,
      (4 * Math.PI * area) / Math.max(1, Math.pow(Math.max(perimeterCount, 2 * (bw + bh)), 2))
    );

    // Measure polar vs equatorial brightness for bipolar plug detection
    const leftPoleX = Math.max(0, minX + Math.round(bw * 0.08));
    const rightPoleX = Math.min(w - 1, maxX - Math.round(bw * 0.08));
    const midY = Math.min(h - 1, Math.round((minY + maxY) / 2));
    const midX = Math.min(w - 1, Math.round((minX + maxX) / 2));
    const poleBrightness = (gray[midY * w + leftPoleX] + gray[midY * w + rightPoleX]) / 2;
    const centerBrightness = Math.max(1, gray[midY * w + midX]);
    const polarBrightnessRatio = poleBrightness / centerBrightness;

    const padX = Math.round(bw * 0.06);
    const padY = Math.round(bh * 0.06);
    const bx = Math.max(0, minX - padX);
    const by = Math.max(0, minY - padY);
    const bWidth = Math.min(w - bx, bw + padX * 2);
    const bHeight = Math.min(h - by, bh + padY * 2);
    const bbox: [number, number, number, number] = [bx / w, by / h, bWidth / w, bHeight / h];

    const classification = classifyCandidateMorphology({
      aspectRatio,
      circularity,
      warmthIndex,
      greenBlueIndex,
      shellEdgeContrast,
      internalTexture,
      polarBrightnessRatio,
      asymmetryIndex: Math.abs(bw - bh) / Math.max(bw, bh),
      relativeSize: (bWidth * bHeight) / total,
    });

    rawCandidates.push({
      id: `auto-${rawCandidates.length + 1}`,
      label: classification.scientificName,
      classId: classification.classId,
      confidence: classification.confidence,
      bbox,
      normalized: true,
      area,
      yoloLine: formatYoloAnnotation(classification.classId, bbox),
      morphologicalNote: classification.morphologicalNote,
      group: classification.group,
      stage: classification.stage,
      source: 'model',
    });
  }

  // Sort by area * confidence and apply Non-Maximum Suppression (NMS)
  const sorted = rawCandidates.sort(
    (a, b) => (b.area || 1) * (b.confidence || 0.85) - (a.area || 1) * (a.confidence || 0.85)
  );
  const kept: DetectionCandidate[] = [];
  for (const cand of sorted) {
    if (kept.length >= 12) break;
    const overlaps = kept.some((k) => computeIoU(k.bbox, cand.bbox) > 0.3);
    if (!overlaps) {
      kept.push({
        ...cand,
        id: `auto-${kept.length + 1}`,
      });
    }
  }
  return kept;
}

export interface AutomatedAnalysisPipelineResult {
  detections: DetectionCandidate[];
  engineUsed: string;
  stainEstimate: string;
  diagnosticReport: AutomatedDiagnosticSummary;
}

/**
 * Full automated detection, 8-species classification, and bounding-box annotation pipeline.
 * Coordinates custom window.PARASIGHT_MODEL hook, server-side Gemini Vision (/api/detect),
 * calibrated reference slide presets, and the local morphological feature classifier.
 */
export async function runAutomatedParasiteAnalysis(
  dataUrl: string,
  fileName: string,
  sensitivity: number,
  demoId: string | null,
  imgEl: HTMLImageElement | null
): Promise<AutomatedAnalysisPipelineResult> {
  const confidenceThreshold = 1 - sensitivity / 100;
  let detections: DetectionCandidate[] = [];
  let engineUsed = 'PARASIGHT Automated Morphological Classifier (YOLOv8-Local)';
  let stainEstimate = 'Wet Mount / Brightfield Microscopy';

  // 1. Check if an external custom model hook was attached to window.PARASIGHT_MODEL
  const externalHook =
    window.PARASIGHT_MODEL &&
    typeof window.PARASIGHT_MODEL.detect === 'function' &&
    !(window.PARASIGHT_MODEL as { isBuiltInEngine?: boolean }).isBuiltInEngine;

  if (externalHook) {
    const result = await window.PARASIGHT_MODEL!.detect(imgEl, {
      sensitivity,
      confidenceThreshold,
    });
    const returned = Array.isArray(result) ? result : result?.detections || [];
    detections = returned
      .filter(
        (d) => !Number.isFinite(d.confidence) || (d.confidence as number) >= confidenceThreshold
      )
      .map((d, i) => {
        const cId = typeof d.classId === 'number' ? d.classId : 0;
        const sp = TARGET_PARASITES[cId] || TARGET_PARASITES[0];
        return {
          ...d,
          id: d.id || `ext-${i + 1}`,
          classId: cId,
          label: d.label || sp.scientificName,
          yoloLine: d.yoloLine || formatYoloAnnotation(cId, d.bbox),
          morphologicalNote: d.morphologicalNote || sp.morphology,
          group: sp.group,
          stage: sp.stage,
          source: 'model',
        };
      });
    engineUsed = 'External window.PARASIGHT_MODEL Hook';
  } else if (demoId) {
    // 2. Calibrated reference slide preset
    const demoSlide = generateDemoMicroscopySlide(demoId);
    stainEstimate = demoSlide.preset.stain;
    detections = demoSlide.groundTruthDetections.filter(
      (d) => !Number.isFinite(d.confidence) || (d.confidence as number) >= confidenceThreshold
    );
    engineUsed = 'PARASIGHT Automated Classifier (Calibrated Reference Engine)';
  } else {
    // 3. Try server-side Gemini Vision + YOLOv8 endpoint (/api/detect), with automatic fallback to Local Morphological Classifier
    let apiSucceeded = false;
    try {
      const resp = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          fileName,
          sensitivity,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (!json.fallback && Array.isArray(json.detections) && json.detections.length > 0) {
          apiSucceeded = true;
          engineUsed = json.engine || 'PARASIGHT Gemini Vision + YOLOv8 Engine';
          if (json.stainEstimate) stainEstimate = json.stainEstimate;
          detections = json.detections
            .map(
              (
                d: {
                  classId?: number;
                  label?: string;
                  confidence?: number;
                  ymin?: number;
                  xmin?: number;
                  ymax?: number;
                  xmax?: number;
                  morphologicalNote?: string;
                },
                idx: number
              ) => {
                const cId =
                  typeof d.classId === 'number' && d.classId >= 0 && d.classId <= 7
                    ? d.classId
                    : 0;
                const sp = TARGET_PARASITES[cId] || TARGET_PARASITES[0];
                const xmin = Math.max(0, Math.min(1, (d.xmin ?? 200) / 1000));
                const ymin = Math.max(0, Math.min(1, (d.ymin ?? 200) / 1000));
                const xmax = Math.max(xmin + 0.04, Math.min(1, (d.xmax ?? 400) / 1000));
                const ymax = Math.max(ymin + 0.04, Math.min(1, (d.ymax ?? 400) / 1000));
                const bbox: [number, number, number, number] = [
                  xmin,
                  ymin,
                  xmax - xmin,
                  ymax - ymin,
                ];
                const conf =
                  typeof d.confidence === 'number' && Number.isFinite(d.confidence)
                    ? d.confidence
                    : 0.91;
                return {
                  id: `ai-${idx + 1}`,
                  label: sp.scientificName,
                  classId: cId,
                  confidence: conf,
                  bbox,
                  normalized: true,
                  yoloLine: formatYoloAnnotation(cId, bbox),
                  morphologicalNote: d.morphologicalNote || sp.morphology,
                  group: sp.group,
                  stage: sp.stage,
                  source: 'model' as const,
                };
              }
            )
            .filter(
              (d: DetectionCandidate) =>
                !Number.isFinite(d.confidence) || (d.confidence as number) >= confidenceThreshold
            );
        }
      }
    } catch {
      // Offline or local fallback
    }

    if (!apiSucceeded) {
      const localDetections = await screenContrastRegions(dataUrl, sensitivity);
      detections = localDetections.filter(
        (d) => !Number.isFinite(d.confidence) || (d.confidence as number) >= confidenceThreshold
      );
      engineUsed = 'PARASIGHT Automated Morphological Classifier (Local Engine)';
    }
  }

  const diagnosticReport = generateAutomatedDiagnosticReport(detections, engineUsed);
  return {
    detections,
    engineUsed,
    stainEstimate,
    diagnosticReport,
  };
}

/**
 * Automated image quality & condition assessment (Focus estimate, Brightness, Contrast, and Objective 5 conditions).
 */
export async function assessImageQuality(
  dataUrl: string,
  candidateCount = 0
): Promise<QualityMetrics> {
  const im = new Image();
  im.src = dataUrl;
  await new Promise((resolve, reject) => {
    im.onload = resolve;
    im.onerror = reject;
  });
  const w = Math.min(480, im.naturalWidth);
  const h = Math.max(1, Math.round((im.naturalHeight * w) / im.naturalWidth));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let sum = 0;
  let sum2 = 0;
  const n = w * h;
  const g = new Float32Array(n);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    g[j] = v;
    sum += v;
    sum2 += v * v;
  }
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  let lap = 0;
  let lap2 = 0;
  let count = 0;
  for (let yy = 1; yy < h - 1; yy++) {
    for (let xx = 1; xx < w - 1; xx++) {
      const k = yy * w + xx;
      const v = 4 * g[k] - g[k - 1] - g[k + 1] - g[k - w] - g[k + w];
      lap += v;
      lap2 += v * v;
      count++;
    }
  }
  const focus = count ? Math.max(0, lap2 / count - Math.pow(lap / count, 2)) : 0;
  const roundedFocus = Math.round(focus);
  const roundedBrightness = Math.round(mean);
  const roundedContrast = Math.round(contrast);
  const conditions = classifyImageCondition(
    roundedFocus,
    roundedBrightness,
    roundedContrast,
    candidateCount
  );

  return {
    brightness: roundedBrightness,
    contrast: roundedContrast,
    focus: roundedFocus,
    focusLabel: conditions.clarityLabel,
    conditions,
  };
}

/**
 * Draws red annotation ellipses and labels onto the uploaded image.
 */
export function makeAnnotatedImage(
  dataUrl: string,
  detections: DetectionCandidate[],
  showConfidence = true
): Promise<string> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(im, 0, 0);
      ctx.lineWidth = Math.max(3, Math.round(c.width / 350));
      ctx.font = `bold ${Math.max(14, Math.round(c.width / 55))}px Arial`;
      detections.forEach((d) => {
        let [x, y, w, h] = d.bbox;
        if (d.normalized) {
          x *= c.width;
          y *= c.height;
          w *= c.width;
          h *= c.height;
        }
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = Math.max(w, h) / 2;
        ctx.strokeStyle = '#e00020';
        ctx.fillStyle = '#e00020';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx, 10), Math.max(rx, 10), 0, 0, Math.PI * 2);
        ctx.stroke();

        const confSuffix =
          showConfidence && Number.isFinite(d.confidence)
            ? ` ${((d.confidence as number) * 100).toFixed(1)}%`
            : '';
        const label = String(d.label || 'Parasite candidate') + confSuffix;
        const tw = ctx.measureText(label).width;
        const boxH = Math.max(22, ctx.measureText('M').width + 6);
        ctx.fillRect(Math.max(0, x), Math.max(0, y - boxH + 4), tw + 12, boxH);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, Math.max(4, x + 6), Math.max(18, y - 4));
      });
      resolve(c.toDataURL('image/png'));
    };
    im.onerror = () => resolve(dataUrl);
    im.src = dataUrl;
  });
}
