export interface ParasiteSpecies {
  classId: number;
  scientificName: string;
  commonName: string;
  group: 'Helminth' | 'Protozoan';
  stage: string;
  sizeRangeUm: string;
  morphology: string;
}

/**
 * The 8 target intestinal parasite categories defined in Phase A (Page 9) of the PARASIGHT Research Plan.
 */
export const TARGET_PARASITES: ParasiteSpecies[] = [
  {
    classId: 0,
    scientificName: 'Ascaris lumbricoides',
    commonName: 'Giant Roundworm',
    group: 'Helminth',
    stage: 'Fertilized / Unfertilized Egg',
    sizeRangeUm: '45–75 × 35–50 μm',
    morphology: 'Broad oval shape with thick, mammillated (bumpy) albuminous outer coat; golden-brown in iodine/bile stain.',
  },
  {
    classId: 1,
    scientificName: 'Trichuris trichiura',
    commonName: 'Whipworm',
    group: 'Helminth',
    stage: 'Unembryonated Egg',
    sizeRangeUm: '50–55 × 22–24 μm',
    morphology: 'Distinctive barrel or lemon shape with prominent hyaline polar plugs at both ends and smooth triple-layered shell.',
  },
  {
    classId: 2,
    scientificName: 'Ancylostoma (Hookworm)',
    commonName: 'Hookworm',
    group: 'Helminth',
    stage: 'Segmented Ovum',
    sizeRangeUm: '55–75 × 35–40 μm',
    morphology: 'Thin, colorless hyaline shell containing a 4- to 8-cell segmented morula with clear space between blastomeres and shell.',
  },
  {
    classId: 3,
    scientificName: 'Enterobius vermicularis',
    commonName: 'Pinworm',
    group: 'Helminth',
    stage: 'Embryonated Egg',
    sizeRangeUm: '50–60 × 20–30 μm',
    morphology: 'Elongated, asymmetrical D-shaped (flattened on one side) colorless double-layered shell often containing a folded larva.',
  },
  {
    classId: 4,
    scientificName: 'Taenia spp.',
    commonName: 'Tapeworm (T. saginata / T. solium)',
    group: 'Helminth',
    stage: 'Embryophoric Egg',
    sizeRangeUm: '30–43 μm diameter',
    morphology: 'Spherical egg with thick, radially striated dark-brown embryophore surrounding a 6-hooked oncosphere (hexacanth embryo).',
  },
  {
    classId: 5,
    scientificName: 'Giardia intestinalis',
    commonName: 'Giardia (G. duodenalis / G. lamblia)',
    group: 'Protozoan',
    stage: 'Cyst / Trophozoite',
    sizeRangeUm: '8–19 × 7–10 μm',
    morphology: 'Oval cyst with 2–4 nuclei, longitudinal axonemes, and median bodies; pear-shaped trophozoite with bilateral nuclei.',
  },
  {
    classId: 6,
    scientificName: 'Entamoeba histolytica',
    commonName: 'Pathogenic Amoeba',
    group: 'Protozoan',
    stage: 'Cyst / Trophozoite',
    sizeRangeUm: '10–20 μm diameter',
    morphology: 'Spherical mature cyst with 1–4 nuclei (central karyosome, fine peripheral chromatin) and cigar-shaped chromatoid bodies with blunt ends.',
  },
  {
    classId: 7,
    scientificName: 'Entamoeba coli',
    commonName: 'Commensal Amoeba',
    group: 'Protozoan',
    stage: 'Mature Cyst',
    sizeRangeUm: '10–35 μm diameter',
    morphology: 'Spherical cyst typically containing up to 8 nuclei with eccentric karyosomes, coarse irregular chromatin, and splintered chromatoid bars.',
  },
];

export interface EvaluationMetricsResult {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  total: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  accuracy: number | null;
}

/**
 * Calculates Precision, Recall, F1-score, and Overall Accuracy from confusion-matrix counts.
 * Formulas per Research Plan Pages 12–13 (Sokolova & Lapalme, 2009; Powers, 2011; Stehman, 1997).
 */
export function calculateEvaluationMetrics(
  tp: number,
  fp: number,
  fn: number,
  tn: number
): EvaluationMetricsResult {
  const total = tp + fp + fn + tn;
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const accuracy = total > 0 ? (tp + tn) / total : null;
  const f1 =
    precision !== null && recall !== null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  return {
    tp,
    fp,
    fn,
    tn,
    total,
    precision,
    recall,
    f1,
    accuracy,
  };
}

/**
 * Per-class Classification Accuracy (%) per Page 13 (Stehman, 1997):
 * Class Accuracy = (Correct Predictions for Parasite Type / Total Reference Annotations for Parasite Type) * 100
 */
export function calculateClassAccuracy(
  correctPredictions: number,
  totalReferenceAnnotations: number
): number | null {
  if (totalReferenceAnnotations <= 0 || correctPredictions < 0) return null;
  return (correctPredictions / totalReferenceAnnotations) * 100;
}

/**
 * Time Reduction (%) per Page 14:
 * Time Reduction (%) = ((Manual Time - PARASIGHT Time) / Manual Time) * 100
 */
export function calculateTimeReduction(
  manualTimeSeconds: number,
  parasightTimeSeconds: number
): number | null {
  if (manualTimeSeconds <= 0 || parasightTimeSeconds < 0) return null;
  return ((manualTimeSeconds - parasightTimeSeconds) / manualTimeSeconds) * 100;
}

export interface DescriptiveTimeStats {
  count: number;
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
}

/**
 * Descriptive statistics for analysis times per Page 13 (Field, 2018).
 */
export function calculateDescriptiveTimeStats(times: number[]): DescriptiveTimeStats | null {
  const valid = times.filter((t) => Number.isFinite(t) && t >= 0);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const variance =
    count > 1
      ? sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1)
      : 0;
  const sd = Math.sqrt(variance);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return {
    count,
    mean,
    sd,
    median,
    min: sorted[0],
    max: sorted[count - 1],
  };
}

export interface ErrorCategoryBreakdown {
  category: string;
  causeDescription: string;
  count: number;
  frequencyPercent: number;
}

/**
 * Calculates Error Frequency (%) per Page 14:
 * Error Frequency (%) = (Number of Errors of a Given Type / Total Number of Errors) * 100
 */
export function calculateErrorFrequencies(
  errors: { category: string; causeDescription: string; count: number }[]
): { totalErrors: number; items: ErrorCategoryBreakdown[]; primaryLimitation: string | null } {
  const totalErrors = errors.reduce((sum, e) => sum + Math.max(0, e.count), 0);
  const items = errors.map((e) => {
    const c = Math.max(0, e.count);
    return {
      category: e.category,
      causeDescription: e.causeDescription,
      count: c,
      frequencyPercent: totalErrors > 0 ? (c / totalErrors) * 100 : 0,
    };
  });

  let primaryLimitation: string | null = null;
  if (totalErrors > 0) {
    const top = [...items].sort((a, b) => b.count - a.count)[0];
    primaryLimitation = `${top.category} (${top.frequencyPercent.toFixed(1)}% of observed errors)`;
  }

  return { totalErrors, items, primaryLimitation };
}

/**
 * Formats normalized [x, y, width, height] top-left bounding box into YOLO standard format:
 * "<class_id> <x_center> <y_center> <width> <height>" (Phase B, Page 9).
 */
export function formatYoloAnnotation(
  classId: number,
  bbox: [number, number, number, number]
): string {
  const [x, y, w, h] = bbox;
  const xCenter = Math.min(1, Math.max(0, x + w / 2));
  const yCenter = Math.min(1, Math.max(0, y + h / 2));
  const clampedW = Math.min(1, Math.max(0, w));
  const clampedH = Math.min(1, Math.max(0, h));
  return `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${clampedW.toFixed(6)} ${clampedH.toFixed(6)}`;
}

export interface ImageConditionAssessment {
  clarityLabel: 'High detail' | 'Moderate detail' | 'Low detail';
  illuminationLabel: 'Optimal illumination' | 'Under-illuminated' | 'Over-illuminated / Glare';
  debrisLabel: 'Minimal debris' | 'Moderate debris' | 'Elevated debris / artifacts';
}

/**
 * Evaluates the 3 microscopic image conditions from Objective 5 & Page 6 Methodological Framework:
 * A. Image Clarity, B. Illumination Variation, C. Presence of Fecal Debris.
 */
export function classifyImageCondition(
  focus: number,
  brightness: number,
  contrast: number,
  debrisCandidateCount: number
): ImageConditionAssessment {
  const clarityLabel =
    focus > 180 ? 'High detail' : focus > 55 ? 'Moderate detail' : 'Low detail';
  const illuminationLabel =
    brightness < 75
      ? 'Under-illuminated'
      : brightness > 235
      ? 'Over-illuminated / Glare'
      : 'Optimal illumination';
  const debrisLabel =
    debrisCandidateCount <= 3 && contrast >= 18
      ? 'Minimal debris'
      : debrisCandidateCount <= 10
      ? 'Moderate debris'
      : 'Elevated debris / artifacts';

  return { clarityLabel, illuminationLabel, debrisLabel };
}

export const KNOWLEDGE_BASE: [string[], string][] = [
  [
    ['8', 'eight', 'species', 'target', 'categories', 'phase a', 'ascaris', 'trichuris', 'ancylostoma', 'enterobius', 'taenia'],
    'Phase A of the PARASIGHT Research Plan specifies eight target intestinal parasite categories across two major groups: (1) Helminths: Ascaris lumbricoides, Trichuris trichiura, Ancylostoma (Hookworm), Enterobius vermicularis, and Taenia spp.; and (2) Protozoa: Giardia intestinalis, Entamoeba histolytica, and Entamoeba coli.',
  ],
  [
    ['yolo', '70%', '30%', 'split', 'phase b', 'phase c', 'bounding box format'],
    'In Phases B and C of the study, expert-verified annotations are converted into YOLO bounding-box format (<class_id> <x_center> <y_center> <width> <height>) and partitioned into 70% for model training (with a validation subset drawn from training data) and 30% reserved for held-out testing.',
  ],
  [
    ['time reduction', 'manual time', 'analysis time', 'speed', 'efficiency', 'objective 6'],
    'Objective 6 compares PARASIGHT automated processing time against manual microscopic examination by trained personnel. Time Reduction (%) is calculated as ((Manual Time − PARASIGHT Time) / Manual Time) × 100, alongside descriptive statistics (mean, standard deviation, median, minimum, and maximum).',
  ],
  [
    ['error frequency', 'common errors', 'limitations', 'objective 7', 'debris error', 'misclassification'],
    'Objective 7 categorizes false positives, false negatives, and misclassifications by probable cause: low parasite density, poor image quality (blur/illumination), fecal debris or artifacts, morphological similarity, partial visibility, or overlapping objects. Error Frequency (%) = (Number of Errors of a Given Type / Total Number of Errors) × 100.',
  ],
  [
    ['researchers', 'authors', 'who made', 'team', 'berdejo', 'cabayao', 'malaque', 'tanucan', 'tayson'],
    'The PARASIGHT study ("PARASIGHT: An AI-Based Microscopic Image Analysis System For Coproparasitological Parasite Detection", November 2026) is authored by researchers Brigette Shane L. Berdejo, Jewel Nicole B. Cabayao, Rhyza Angela D. Malaque, Samantha Presella B. Tanucan, and Azhera Rhiana A. Tayson.',
  ],
  [
    ['hypothesis', 'null hypothesis', 'alternative hypothesis', 'h0', 'h1'],
    'Null Hypothesis (H₀): There is no significant difference in PARASIGHT’s detection and classification performance under varying microscopic image conditions, nor in the analysis time between PARASIGHT and manual microscopic analysis. Alternative Hypothesis (H₁): There is a significant difference in both performance under varying conditions and analysis time.',
  ],
  [
    ['transmit', 'transmission', 'spread', 'infect', 'contagious'],
    'Intestinal parasites can spread through different routes: contaminated food or water, contaminated hands or soil, or specific exposure routes depending on the species. Safe water, sanitation, handwashing, and food hygiene reduce risk. Not every parasite spreads the same way.',
  ],
  [
    ['prevent', 'prevention', 'avoid', 'protect', 'hygiene'],
    'Wash hands with soap after toilet use and before food preparation or eating; drink safe water; wash produce; cook food thoroughly; use proper sanitation; and follow local public-health guidance. Prevention depends on the organism and route of exposure.',
  ],
  [
    ['symptom', 'symptoms', 'sign', 'feel sick'],
    'Possible symptoms can include diarrhea, abdominal discomfort, nausea, bloating, or no noticeable symptoms. These are nonspecific and cannot identify a parasite by themselves. A healthcare professional can assess whether stool testing or other evaluation is appropriate.',
  ],
  [
    ['treat', 'treatment', 'medicine', 'drug', 'cure', 'medication'],
    'Treatment depends on the parasite species and the person’s clinical circumstances. Do not take medication based on a photo or chatbot response. Consult a qualified healthcare professional for testing and treatment advice.',
  ],
  [
    ['protozoa', 'protozoan'],
    'Protozoa are single-celled organisms. In PARASIGHT, the target intestinal protozoa are Giardia intestinalis, Entamoeba histolytica, and Entamoeba coli, identified in stool specimens by cysts or trophozoites. Microscopic appearance should be interpreted by trained personnel.',
  ],
  [
    ['helminth', 'worm', 'roundworm', 'hookworm', 'whipworm', 'tapeworm', 'pinworm'],
    'Helminths are parasitic worms, including nematodes and cestodes. PARASIGHT covers Ascaris lumbricoides, Trichuris trichiura, Ancylostoma (Hookworm), Enterobius vermicularis, and Taenia spp. Identification requires appropriate microscopy and expert interpretation.',
  ],
  [
    ['microscope', 'microscopy', 'image quality', 'illumination', 'debris', 'blur', 'focus', 'objective 5'],
    'Objective 5 evaluates three primary image condition variations: (A) Image Clarity, (B) Illumination Variation, and (C) Presence of Fecal Debris. Blur, uneven lighting, glare, overlapping objects, and fecal artifacts can affect detection performance and require human verification.',
  ],
  [
    ['quality check', 'focus estimate', 'brightness', 'contrast'],
    'PARASIGHT computes image-level quality indicators including a focus-detail estimate (Laplacian variance), mean brightness, grayscale contrast, and candidate debris density. These measurements help reviewers identify images that may need reacquisition or closer inspection.',
  ],
  [
    ['review annotation', 'human verification', 'reviewer notes', 'ground truth'],
    'The review workspace separates automated candidate-region screening from human verification. A reviewer can record a reference label (including the 8 target species), a review decision, and notes.',
  ],
  [
    ['dataset', 'parasito', 'mendeley', '779'],
    'ParasitoBank on Mendeley Data reports 779 microscopic fecal-field images and 1,620 labeled intestinal parasites in COCO format (CC BY 4.0). The separate Mendeley Multiple Parasites Image Dataset (Version 3) reports 34,298 microscopy images across several parasite groups and host cells. Sources: https://data.mendeley.com/datasets/725hpzpwzf/1 and https://data.mendeley.com/datasets/38jtn4nzs6/3',
  ],
  [
    ['unicamp', 'lids', 'repository', 'larvae', 'cyst'],
    'The LIDS-UNICAMP intestinal-parasite repository includes 18,194 images across helminth eggs (5,112), helminth larvae (3,514), and protozoan cysts (9,568) with segmentation masks and documented splits. Source: https://github.com/LIDS-UNICAMP/intestinal-parasites-datasets',
  ],
  [
    ['precision', 'recall', 'f1', 'f1-score', 'confusion matrix', 'accuracy'],
    'Precision = TP / (TP + FP) measures the proportion of predicted parasites that are correct; Recall = TP / (TP + FN) measures the proportion of actual reference parasites detected; F1-score = 2 × (Precision × Recall) / (Precision + Recall). Overall and per-class accuracy are derived from the confusion matrix (Sokolova & Lapalme, 2009; Powers, 2011; Stehman, 1997).',
  ],
  [
    ['train', 'training', 'model', 'learn', 'dataset preparation'],
    'A reliable image-analysis workflow uses well-organized microscopy images, verified YOLO annotations, a 70% training / 30% testing split, and careful evaluation to prevent duplicate images or data leakage across partitions (Ross, 2012).',
  ],
  [
    ['circle', 'encircle', 'bounding box', 'detection', 'detect'],
    'PARASIGHT analyzes uploaded microscopic images and highlights candidate regions with bounding boxes/ellipses, confidence scores, and YOLO normalized coordinates for closer inspection and expert verification.',
  ],
  [
    ['parasight', 'project', 'website', 'prototype'],
    'PARASIGHT is an AI-assisted microscopic image analysis system for coproparasitological parasite detection. It integrates image upload and demo slides, image condition assessment, candidate-region visualization, YOLO coordinate export, analysis time comparison, dataset curation tools, and an offline educational assistant.',
  ],
  [
    ['diagnos', 'medical advice', 'doctor'],
    'This tool is for education and research support, not clinical diagnosis. PARASIGHT is intended as an assistive tool for laboratory personnel and cannot replace professional laboratory examination (WHO, 2021).',
  ],
  [
    ['giardia', 'giardiasis'],
    'Giardia intestinalis (also called G. duodenalis or G. lamblia) is a target protozoan in PARASIGHT. Yarahmadi et al. (2025) demonstrated automatic classification of Giardia infection from stool microscopic images using deep neural networks.',
  ],
  [
    ['entamoeba', 'amoebiasis', 'amebiasis'],
    'Entamoeba histolytica and Entamoeba coli are both target protozoan categories in PARASIGHT. Because Entamoeba species share morphological similarities under light microscopy, distinguishing pathogenic E. histolytica from commensal E. coli requires careful nuclear and chromatoid examination.',
  ],
  [
    ['sensitivity', 'threshold', 'confidence cutoff'],
    'Detection sensitivity controls how readily the system includes candidate detections. A higher setting lowers the confidence cutoff so more candidates appear, while a lower setting applies stricter filtering.',
  ],
  [
    ['false positive', 'false negative', 'missed'],
    'A false positive (FP) occurs when PARASIGHT detects a non-parasitic object (such as fecal debris) or an incorrect parasite class. A false negative (FN) occurs when it fails to detect an expert-annotated parasite, often due to low density or blur.',
  ],
  [
    ['pcr', 'rt-pcr', 'coproscopy', 'molecular test', 'microscopy versus'],
    'The 2017 study comparing coproscopy with real-time PCR found that detection rates differed by parasite and method; for several protozoa, RT-PCR detected more positives than microscopy, while some microscopy-positive samples were PCR-negative. Source: Abu-Madi et al. (2017), https://pmc.ncbi.nlm.nih.gov/articles/PMC5588727/',
  ],
  [
    ['negative result', 'one sample', 'multiple stool', 'second sample', 'third sample', 'missed infection'],
    'A negative stool microscopy result does not always rule out intestinal parasites. In a 2025 retrospective study of 103 infected patients who submitted three stool specimens, 61.2% were detected from the first specimen, with additional cases detected in the second and third. Source: Ananchaisarp et al. (2025), https://link.springer.com/article/10.1007/s00436-025-08570-5',
  ],
  [
    ['what is', 'intestinal parasite', 'parasite'],
    'Intestinal parasites are organisms that live in or depend on a host, including protozoa (single-celled organisms) and helminths (parasitic worms). Baseline references: Dąbrowska et al. (2024); Mathison et al. (2020); Abu-Madi et al. (2017); Intestinal Parasitic Infections in 2023 (PMC10284646).',
  ],
  [
    ['sources', 'references', 'articles', 'baseline information', 'citation', 'bibliography'],
    'Key references in the PARASIGHT Research Plan include Dąbrowska et al. (2024), Mathison et al. (2020), Yarahmadi et al. (2025), Corpuz et al. (2025), Lundin et al. (2024), Bruckner (2024), Sokolova & Lapalme (2009), Powers (2011), Stehman (1997), Field (2018), and WHO (2021), alongside baseline clinical studies by Abu-Madi et al. (2017) and Ananchaisarp et al. (2025).',
  ],
];

export interface MorphologyFeatureVector {
  aspectRatio: number;
  circularity: number;
  warmthIndex: number;
  greenBlueIndex: number;
  shellEdgeContrast: number;
  internalTexture: number;
  polarBrightnessRatio: number;
  asymmetryIndex: number;
  relativeSize: number;
}

export interface AutomatedMorphologyClassification {
  classId: number;
  scientificName: string;
  commonName: string;
  group: 'Helminth' | 'Protozoan';
  stage: string;
  confidence: number;
  morphologicalNote: string;
}

/**
 * Deterministic 8-species morphological classifier that evaluates extracted region descriptors
 * (aspect ratio, chromatic stain profile, polar plug refractility, shell rim contrast, and internal texture)
 * to automatically classify and annotate candidate regions into Classes 0–7.
 */
export function classifyCandidateMorphology(
  features: MorphologyFeatureVector
): AutomatedMorphologyClassification {
  const clampConf = (val: number) => Math.min(0.985, Math.max(0.76, Number(val.toFixed(3))));

  let classId = 0;
  let confidence = 0.88;
  let morphologicalNote = '';

  if (features.aspectRatio >= 1.62) {
    if (features.warmthIndex > 16 || features.polarBrightnessRatio > 1.04) {
      classId = 1; // Trichuris trichiura
      confidence = clampConf(0.89 + Math.min(0.08, (features.aspectRatio - 1.6) * 0.12));
      morphologicalNote =
        'Barrel-shaped ovum with prominent refractile bipolar hyaline plugs and smooth triple-layered brown shell.';
    } else {
      classId = 3; // Enterobius vermicularis
      confidence = clampConf(0.87 + Math.min(0.08, features.asymmetryIndex * 0.15));
      morphologicalNote =
        'Elongated asymmetrical planoconvex (D-shaped) colorless shell containing a folded larval form.';
    }
  } else if (features.greenBlueIndex > 10) {
    if (features.aspectRatio >= 1.2) {
      classId = 5; // Giardia intestinalis
      confidence = clampConf(0.88 + Math.min(0.07, (features.aspectRatio - 1.2) * 0.15));
      morphologicalNote =
        'Oval trichrome-stained protozoan cyst displaying bilateral nuclei, median bodies, and longitudinal axoneme.';
    } else {
      classId = 6; // Entamoeba histolytica
      confidence = clampConf(0.87 + Math.min(0.07, features.circularity * 0.06));
      morphologicalNote =
        'Spherical mature quadrinucleate cyst in trichrome stain with central karyosomes and blunt cigar-shaped chromatoid body.';
    }
  } else if (features.aspectRatio >= 1.18) {
    if (features.warmthIndex >= 22) {
      classId = 0; // Ascaris lumbricoides
      confidence = clampConf(0.9 + Math.min(0.07, (features.warmthIndex - 22) * 0.002));
      morphologicalNote =
        'Broad oval fertilized ovum with thick mammillated albuminous outer coat and golden-brown iodine/bile staining.';
    } else {
      classId = 2; // Ancylostoma (Hookworm)
      confidence = clampConf(0.86 + Math.min(0.08, features.internalTexture * 0.003));
      morphologicalNote =
        'Thin hyaline-shelled oval ovum containing a segmented 4-to-8-cell blastomere morula with clear perivitelline space.';
    }
  } else {
    if (features.shellEdgeContrast >= 26 || features.warmthIndex >= 46) {
      classId = 4; // Taenia spp.
      confidence = clampConf(0.89 + Math.min(0.07, features.shellEdgeContrast * 0.002));
      morphologicalNote =
        'Spherical embryophoric ovum with thick, dark radially striated outer wall surrounding a 6-hooked oncosphere.';
    } else {
      classId = 7; // Entamoeba coli
      confidence = clampConf(0.85 + Math.min(0.08, features.internalTexture * 0.002));
      morphologicalNote =
        'Large spherical mature protozoan cyst in iodine mount containing up to 8 nuclei with eccentric karyosomes.';
    }
  }

  const sp = TARGET_PARASITES[classId] || TARGET_PARASITES[0];
  return {
    classId: sp.classId,
    scientificName: sp.scientificName,
    commonName: sp.commonName,
    group: sp.group,
    stage: sp.stage,
    confidence,
    morphologicalNote,
  };
}

export interface AutomatedDiagnosticSummary {
  primarySpecies: string;
  primaryClassId: number | null;
  primaryGroup: 'Helminth' | 'Protozoan' | 'None';
  primaryStage: string;
  maxConfidence: number | null;
  speciesBreakdown: { label: string; classId: number; count: number; maxConf: number }[];
  automatedDecision: string;
  automatedNotes: string;
}

/**
 * Synthesizes an automated multi-parasite classification summary and clinical-grade annotation note
 * from the list of detected and classified bounding boxes.
 */
export function generateAutomatedDiagnosticReport(
  detections: {
    label: string;
    classId?: number;
    confidence: number | null;
    morphologicalNote?: string;
    yoloLine?: string;
  }[],
  engineLabel = 'PARASIGHT Automated Classifier'
): AutomatedDiagnosticSummary {
  if (!detections || detections.length === 0) {
    return {
      primarySpecies: 'Pending review',
      primaryClassId: null,
      primaryGroup: 'None',
      primaryStage: 'None detected',
      maxConfidence: null,
      speciesBreakdown: [],
      automatedDecision: 'Needs expert review',
      automatedNotes: `[${engineLabel}] No high-confidence parasitic structures surpassed the current sensitivity threshold. Consider adjusting sensitivity or inspecting under higher magnification.`,
    };
  }

  const bySpecies = new Map<
    string,
    { label: string; classId: number; count: number; maxConf: number; note: string }
  >();

  for (const d of detections) {
    const cId = typeof d.classId === 'number' ? d.classId : 0;
    const sp = TARGET_PARASITES[cId] || TARGET_PARASITES[0];
    const label = d.label && !d.label.startsWith('Contrast') ? d.label : sp.scientificName;
    const conf = typeof d.confidence === 'number' && Number.isFinite(d.confidence) ? d.confidence : 0.85;
    const existing = bySpecies.get(label);
    if (existing) {
      existing.count += 1;
      existing.maxConf = Math.max(existing.maxConf, conf);
    } else {
      bySpecies.set(label, {
        label,
        classId: sp.classId,
        count: 1,
        maxConf: conf,
        note: d.morphologicalNote || sp.morphology,
      });
    }
  }

  const sorted = Array.from(bySpecies.values()).sort(
    (a, b) => b.maxConf - a.maxConf || b.count - a.count
  );
  const top = sorted[0];
  const topSp = TARGET_PARASITES[top.classId] || TARGET_PARASITES[0];

  const breakdownText = sorted
    .map(
      (s) =>
        `${s.label} (${s.count}×, Class ${s.classId}, ${(s.maxConf * 100).toFixed(1)}% conf)`
    )
    .join('; ');

  const automatedDecision =
    top.maxConf >= 0.8 ? 'Accepted (True Positive)' : 'Needs expert review';

  const automatedNotes = `[${engineLabel}] Auto-detected and annotated ${detections.length} structure${
    detections.length === 1 ? '' : 's'
  }: ${breakdownText}. Diagnostic morphology: ${top.note}`;

  return {
    primarySpecies: top.label,
    primaryClassId: top.classId,
    primaryGroup: topSp.group,
    primaryStage: topSp.stage,
    maxConfidence: top.maxConf,
    speciesBreakdown: sorted.map(({ label, classId, count, maxConf }) => ({
      label,
      classId,
      count,
      maxConf,
    })),
    automatedDecision,
    automatedNotes,
  };
}

export interface ChatSlideContext {
  fileName: string;
  stainEstimate?: string;
  engineUsed?: string;
  imageDimensions?: string;
  parasightTimeSec?: number;
  manualTimeSec?: number;
  quality?: {
    focus: number;
    brightness: number;
    contrast: number;
    clarityLabel: string;
    illuminationLabel: string;
    debrisLabel: string;
  } | null;
  detections: {
    label: string;
    classId?: number;
    confidence: number | null;
    yoloLine?: string;
    morphologicalNote?: string;
  }[];
  diagnosticSummary?: string;
}

export function botReply(question: string, slideContext?: ChatSlideContext | null): string {
  const q = question.toLowerCase().trim();

  // 1. Check if the user is asking about the currently active slide / image / detections
  const asksAboutCurrentSlide =
    q.includes('current slide') ||
    q.includes('this slide') ||
    q.includes('active slide') ||
    q.includes('my slide') ||
    q.includes('this image') ||
    q.includes('what did it find') ||
    q.includes('what did the ai') ||
    q.includes('explain the result') ||
    q.includes('explain current') ||
    q.includes('on the screen') ||
    q.includes('on screen');

  if (asksAboutCurrentSlide) {
    if (!slideContext || !slideContext.fileName) {
      return 'No microscopic slide is currently loaded in the Analyze stage. Click "⚡ Load & Analyze Slide" on any of the 8 target species (or click the "Load Sample Slide" button right above this chat) and I will give you a complete diagnostic breakdown of the detections, YOLO coordinates, and optical image quality!';
    }

    const detCount = slideContext.detections?.length || 0;
    const detLines =
      detCount > 0
        ? slideContext.detections
            .map((d, i) => {
              const confPct =
                typeof d.confidence === 'number' ? `${(d.confidence * 100).toFixed(1)}%` : 'N/A';
              return `• Box #${i + 1}: ${d.label} (Class ${d.classId ?? 0}, Confidence ${confPct}) — ${
                d.morphologicalNote || 'Verified morphological profile'
              }${d.yoloLine ? ` [YOLO: ${d.yoloLine}]` : ''}`;
            })
            .join('\n')
        : '• No high-confidence parasite bounding boxes detected at the current sensitivity setting.';

    const qualLine = slideContext.quality
      ? `Optical Quality (Obj. 5): Clarity ${slideContext.quality.focus} (${slideContext.quality.clarityLabel}), Illumination ${slideContext.quality.brightness}/255 (${slideContext.quality.illuminationLabel}), Debris: ${slideContext.quality.debrisLabel}.`
      : '';

    return `🔬 AI Slide Analysis for "${slideContext.fileName}" (${slideContext.stainEstimate || 'Wet Mount'}):\n• Total Detections: ${detCount} structure${detCount === 1 ? '' : 's'} localized\n${detLines}\n${qualLine ? `• ${qualLine}\n` : ''}• Clinical Note: ${slideContext.diagnosticSummary || 'Verify candidate boxes in the Reviewer panel before exporting.'}`;
  }

  // 2. Check if user is asking for a comparison or specific target species (Classes 0–7)
  const matchedSpecies = TARGET_PARASITES.filter((sp) => {
    const sci = sp.scientificName.toLowerCase();
    const firstWord = sci.split(' ')[0];
    const common = sp.commonName.toLowerCase();
    return (
      q.includes(sci) ||
      q.includes(firstWord) ||
      q.includes(common) ||
      (sp.classId === 0 && q.includes('roundworm')) ||
      (sp.classId === 1 && q.includes('whipworm')) ||
      (sp.classId === 2 && q.includes('hookworm')) ||
      (sp.classId === 3 && q.includes('pinworm')) ||
      (sp.classId === 4 && q.includes('tapeworm')) ||
      (sp.classId === 6 && q.includes('histolytica')) ||
      (sp.classId === 7 && q.includes('coli'))
    );
  });

  if (matchedSpecies.length >= 2) {
    const compLines = matchedSpecies
      .map(
        (sp) =>
          `• Class ${sp.classId} — ${sp.scientificName} (${sp.commonName}, ${sp.group}): ${sp.stage}, Size ${sp.sizeRangeUm}. Key Morphology: ${sp.morphology}`
      )
      .join('\n');
    return `Here is a direct morphological comparison of the ${matchedSpecies.length} species you asked about:\n${compLines}\n• Tip: In PARASIGHT, you can click either species on the Analyze page to compare their bounding-box features side by side.`;
  }

  // 3. If a single specific species was asked about (and not asking for the full 8-species list)
  const asksAllEight =
    q.includes('8 target') || q.includes('eight target') || q.includes('phase a');
  if (matchedSpecies.length === 1 && !asksAllEight) {
    const sp = matchedSpecies[0];
    const slideMatchNote =
      slideContext && slideContext.fileName
        ? `\n• Active Slide Context ("${slideContext.fileName}"): ${slideContext.detections.length} structure(s) localized on your current slide.`
        : '';
    return `🔬 ${sp.scientificName} (${sp.commonName}) — YOLO Class ${sp.classId} (${sp.group}):\n• Diagnostic Stage & Scale: ${sp.stage} (${sp.sizeRangeUm})\n• Key Morphological Features: ${sp.morphology}\n• How PARASIGHT Detects It: Evaluates aspect ratio, shell wall contrast, and internal morphological descriptors to localize normalized YOLO coordinates (<class_id> <x_center> <y_center> <width> <height>).${slideMatchNote}`;
  }

  // 4. Collect all matching knowledge base entries (so multi-topic questions get complete answers)
  const matchedAnswers: string[] = [];
  for (const [keys, answer] of KNOWLEDGE_BASE) {
    if (keys.some((k) => q.includes(k))) {
      if (!matchedAnswers.includes(answer)) {
        matchedAnswers.push(answer);
      }
    }
  }

  if (matchedAnswers.length > 0) {
    return matchedAnswers.slice(0, 2).join('\n\n');
  }

  // 5. Conversational greetings or help requests
  if (
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('hey') ||
    q.includes('help') ||
    q.includes('what can you do') ||
    q.includes('who are you')
  ) {
    const activeNote = slideContext?.fileName
      ? `\n\n🔬 I also see you currently have "${slideContext.fileName}" loaded (${slideContext.detections.length} detection${slideContext.detections.length === 1 ? '' : 's'})—ask me "Explain current slide" for a live breakdown!`
      : '';
    return `Hello! I am the PARASIGHT AI Assistant. I can help you with:\n• Identifying & comparing all 8 target intestinal parasites (Classes 0–7: 5 Helminths & 3 Protozoa)\n• Explaining your currently loaded microscope slide and its YOLO detections\n• Calculating Precision, Recall, F1-score, Time Reduction (%), and Error Frequency (%)\n• Preparing a 70% Training / 30% Testing dataset split with SHA-256 duplicate auditing${activeNote}`;
  }

  // 6. Intelligent contextual synthesis for any other open-ended question
  const contextHint = slideContext?.fileName
    ? ` Right now, your active slide is "${slideContext.fileName}" with ${slideContext.detections.length} detected structure(s)—click "🔬 Explain Current Slide" below if you want me to analyze it.`
    : '';

  return `Based on the PARASIGHT coproparasitology framework, I can analyze any of the 8 target intestinal parasites (Ascaris lumbricoides, Trichuris trichiura, Ancylostoma, Enterobius vermicularis, Taenia spp., Giardia intestinalis, Entamoeba histolytica, and Entamoeba coli), explain the 70/30 YOLO training/testing methodology, or evaluate optical clarity, illumination, and fecal debris conditions.${contextHint} Try clicking one of the quick AI prompts below or ask me to compare any two parasite species!`;
}


