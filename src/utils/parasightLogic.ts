export interface ParasiteSpecies {
  classId: number;
  scientificName: string;
  commonName: string;
  group: 'Helminth' | 'Protozoan';
  stage: string;
  sizeRangeUm: string;
  morphology: string;
  associatedIllness: string;
  commonSymptoms: string;
  transmissionRoute: string;
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
    associatedIllness: 'Ascariasis (Intestinal Roundworm Infection)',
    commonSymptoms: 'Abdominal pain or discomfort, bloating, nausea, intermittent diarrhea, nutritional malabsorption, or cough/wheezing during larval lung migration (Löffler syndrome); light infections may be asymptomatic.',
    transmissionRoute: 'Fecal-oral ingestion of embryonated eggs from contaminated soil, water, or unwashed produce.',
  },
  {
    classId: 1,
    scientificName: 'Trichuris trichiura',
    commonName: 'Whipworm',
    group: 'Helminth',
    stage: 'Unembryonated Egg',
    sizeRangeUm: '50–55 × 22–24 μm',
    morphology: 'Distinctive barrel or lemon shape with prominent hyaline polar plugs at both ends and smooth triple-layered shell.',
    associatedIllness: 'Trichuriasis (Human Whipworm Infection)',
    commonSymptoms: 'Mucoid or bloody diarrhea (Trichuris dysentery syndrome in heavy infections), abdominal cramps, tenesmus (painful urge to defecate), iron-deficiency anemia, and impaired growth.',
    transmissionRoute: 'Fecal-oral ingestion of embryonated eggs from soil-contaminated hands, food, or water.',
  },
  {
    classId: 2,
    scientificName: 'Ancylostoma (Hookworm)',
    commonName: 'Hookworm',
    group: 'Helminth',
    stage: 'Segmented Ovum',
    sizeRangeUm: '55–75 × 35–40 μm',
    morphology: 'Thin, colorless hyaline shell containing a 4- to 8-cell segmented morula with clear space between blastomeres and shell.',
    associatedIllness: 'Ancylostomiasis / Hookworm Disease',
    commonSymptoms: 'Iron-deficiency anemia, chronic fatigue, weakness, epigastric abdominal pain, pallor, and localized itchy skin rash ("ground itch") at the site of larval skin penetration.',
    transmissionRoute: 'Percutaneous penetration of filariform larvae from contaminated soil (commonly barefoot contact) or oral ingestion.',
  },
  {
    classId: 3,
    scientificName: 'Enterobius vermicularis',
    commonName: 'Pinworm',
    group: 'Helminth',
    stage: 'Embryonated Egg',
    sizeRangeUm: '50–60 × 20–30 μm',
    morphology: 'Elongated, asymmetrical D-shaped (flattened on one side) colorless double-layered shell often containing a folded larva.',
    associatedIllness: 'Enterobiasis / Oxyuriasis (Pinworm Infection)',
    commonSymptoms: 'Intense nocturnal perianal itching (pruritus ani), disturbed sleep, irritability, restlessness, and secondary skin excoriation.',
    transmissionRoute: 'Fecal-oral autoinfection or person-to-person spread via embryonated eggs on hands, bedding, clothing, or surfaces.',
  },
  {
    classId: 4,
    scientificName: 'Taenia spp.',
    commonName: 'Tapeworm (T. saginata / T. solium)',
    group: 'Helminth',
    stage: 'Embryophoric Egg',
    sizeRangeUm: '30–43 μm diameter',
    morphology: 'Spherical egg with thick, radially striated dark-brown embryophore surrounding a 6-hooked oncosphere (hexacanth embryo).',
    associatedIllness: 'Taeniasis (Intestinal Tapeworm Infection) & potential Cysticercosis (T. solium)',
    commonSymptoms: 'Mild abdominal discomfort, nausea, appetite changes, weight loss, passage of tapeworm proglottid segments in stool; T. solium egg ingestion can cause neurocysticercosis (headaches, seizures).',
    transmissionRoute: 'Consumption of raw or undercooked infected beef (T. saginata) or pork (T. solium); fecal-oral egg ingestion for T. solium cysticercosis.',
  },
  {
    classId: 5,
    scientificName: 'Giardia intestinalis',
    commonName: 'Giardia (G. duodenalis / G. lamblia)',
    group: 'Protozoan',
    stage: 'Cyst / Trophozoite',
    sizeRangeUm: '8–19 × 7–10 μm',
    morphology: 'Oval cyst with 2–4 nuclei, longitudinal axonemes, and median bodies; pear-shaped trophozoite with bilateral nuclei.',
    associatedIllness: 'Giardiasis (Flagellate Protozoan Enteritis / "Beaver Fever")',
    commonSymptoms: 'Foul-smelling watery or greasy stools (steatorrhea), flatulence, abdominal cramps, sulfur burps, bloating, fatigue, and weight loss.',
    transmissionRoute: 'Ingestion of hardy cysts in contaminated drinking or recreational water, food, or person-to-person fecal-oral contact.',
  },
  {
    classId: 6,
    scientificName: 'Entamoeba histolytica',
    commonName: 'Pathogenic Amoeba',
    group: 'Protozoan',
    stage: 'Cyst / Trophozoite',
    sizeRangeUm: '10–20 μm diameter',
    morphology: 'Spherical mature cyst with 1–4 nuclei (central karyosome, fine peripheral chromatin) and cigar-shaped chromatoid bodies with blunt ends.',
    associatedIllness: 'Amoebiasis (Amoebic Colitis / Amoebic Dysentery & Extraintestinal Amoebic Liver Abscess)',
    commonSymptoms: 'Gradual onset of colicky lower abdominal pain, frequent loose stools with blood and mucus, fever, tenesmus; potential right-upper-quadrant pain if hepatic abscess develops.',
    transmissionRoute: 'Fecal-oral ingestion of mature quadrinucleate cysts in contaminated water or food.',
  },
  {
    classId: 7,
    scientificName: 'Entamoeba coli',
    commonName: 'Commensal Amoeba',
    group: 'Protozoan',
    stage: 'Mature Cyst',
    sizeRangeUm: '10–35 μm diameter',
    morphology: 'Spherical cyst typically containing up to 8 nuclei with eccentric karyosomes, coarse irregular chromatin, and splintered chromatoid bars.',
    associatedIllness: 'Non-Pathogenic Commensal Colonization (Indicator of Fecal-Oral Exposure)',
    commonSymptoms: 'Generally asymptomatic and harmless by itself, but indicates ingestion of fecal-contaminated water or food—warranting screening for co-occurring pathogenic parasites.',
    transmissionRoute: 'Fecal-oral ingestion of mature cysts via contaminated water or food.',
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
  primaryAssociatedIllness: string;
  primarySymptoms: string;
  primaryTransmission: string;
  speciesBreakdown: {
    label: string;
    classId: number;
    count: number;
    maxConf: number;
    associatedIllness: string;
    commonSymptoms: string;
    transmissionRoute: string;
  }[];
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
      primaryAssociatedIllness: 'No parasitic infection / illness identified at current threshold',
      primarySymptoms: 'None indicated from current microscopic field.',
      primaryTransmission: 'N/A',
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
  }: ${breakdownText}. Possible associated illness: ${topSp.associatedIllness}. Diagnostic morphology: ${top.note}`;

  return {
    primarySpecies: top.label,
    primaryClassId: top.classId,
    primaryGroup: topSp.group,
    primaryStage: topSp.stage,
    maxConfidence: top.maxConf,
    primaryAssociatedIllness: topSp.associatedIllness,
    primarySymptoms: topSp.commonSymptoms,
    primaryTransmission: topSp.transmissionRoute,
    speciesBreakdown: sorted.map(({ label, classId, count, maxConf }) => {
      const spInfo = TARGET_PARASITES[classId] || TARGET_PARASITES[0];
      return {
        label,
        classId,
        count,
        maxConf,
        associatedIllness: spInfo.associatedIllness,
        commonSymptoms: spInfo.commonSymptoms,
        transmissionRoute: spInfo.transmissionRoute,
      };
    }),
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
    associatedIllness?: string;
    commonSymptoms?: string;
  }[];
  diagnosticSummary?: string;
  associatedIllness?: string;
  commonSymptoms?: string;
}




