import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_PARASITES,
  calculateEvaluationMetrics,
  calculateClassAccuracy,
  calculateTimeReduction,
  calculateDescriptiveTimeStats,
  calculateErrorFrequencies,
  formatYoloAnnotation,
  classifyImageCondition,
  classifyCandidateMorphology,
  generateAutomatedDiagnosticReport,
  botReply,
} from './parasightLogic';

test('TARGET_PARASITES defines all 8 species from Phase A of the Research Plan', () => {
  assert.equal(TARGET_PARASITES.length, 8);
  const names = TARGET_PARASITES.map((p) => p.scientificName);
  assert.ok(names.includes('Ascaris lumbricoides'));
  assert.ok(names.includes('Trichuris trichiura'));
  assert.ok(names.includes('Ancylostoma (Hookworm)'));
  assert.ok(names.includes('Enterobius vermicularis'));
  assert.ok(names.includes('Taenia spp.'));
  assert.ok(names.includes('Giardia intestinalis'));
  assert.ok(names.includes('Entamoeba histolytica'));
  assert.ok(names.includes('Entamoeba coli'));
});

test('calculateEvaluationMetrics computes Precision, Recall, F1-score, and Accuracy correctly', () => {
  const res = calculateEvaluationMetrics(80, 10, 20, 90);
  assert.equal(res.total, 200);
  assert.ok(res.precision !== null && Math.abs(res.precision - 80 / 90) < 1e-6);
  assert.ok(res.recall !== null && Math.abs(res.recall - 80 / 100) < 1e-6);
  assert.ok(res.accuracy !== null && Math.abs(res.accuracy - 170 / 200) < 1e-6);
  const expectedF1 = (2 * (80 / 90) * 0.8) / (80 / 90 + 0.8);
  assert.ok(res.f1 !== null && Math.abs(res.f1 - expectedF1) < 1e-6);
});

test('calculateClassAccuracy and calculateTimeReduction follow Page 13-14 formulas', () => {
  assert.equal(calculateClassAccuracy(45, 50), 90);
  assert.equal(calculateClassAccuracy(0, 0), null);

  // Manual = 120s, PARASIGHT = 3s -> ((120 - 3) / 120) * 100 = 97.5%
  assert.equal(calculateTimeReduction(120, 3), 97.5);
  assert.equal(calculateTimeReduction(0, 5), null);
});

test('calculateDescriptiveTimeStats computes mean, sd, median, min, max', () => {
  const stats = calculateDescriptiveTimeStats([2.0, 4.0, 6.0, 8.0]);
  assert.ok(stats !== null);
  assert.equal(stats.count, 4);
  assert.equal(stats.mean, 5.0);
  assert.equal(stats.median, 5.0);
  assert.equal(stats.min, 2.0);
  assert.equal(stats.max, 8.0);
  assert.ok(Math.abs(stats.sd - Math.sqrt(20 / 3)) < 1e-6);
});

test('calculateErrorFrequencies computes percentages and identifies primary limitation', () => {
  const result = calculateErrorFrequencies([
    { category: 'Fecal Debris / Artifacts (FP)', causeDescription: 'Non-parasitic debris', count: 12 },
    { category: 'Low Parasite Density / Blur (FN)', causeDescription: 'Missed objects', count: 8 },
  ]);
  assert.equal(result.totalErrors, 20);
  assert.equal(result.items[0].frequencyPercent, 60);
  assert.equal(result.items[1].frequencyPercent, 40);
  assert.ok(result.primaryLimitation?.includes('60.0%'));
});

test('formatYoloAnnotation converts top-left normalized box to center-based YOLO row', () => {
  const line = formatYoloAnnotation(1, [0.2, 0.3, 0.1, 0.2]);
  assert.equal(line, '1 0.250000 0.400000 0.100000 0.200000');
});

test('classifyImageCondition categorizes clarity, illumination, and debris', () => {
  const c1 = classifyImageCondition(240, 140, 42, 2);
  assert.equal(c1.clarityLabel, 'High detail');
  assert.equal(c1.illuminationLabel, 'Optimal illumination');
  assert.equal(c1.debrisLabel, 'Minimal debris');
});

test('classifyCandidateMorphology and generateAutomatedDiagnosticReport classify and annotate species', () => {
  const trichuris = classifyCandidateMorphology({
    aspectRatio: 1.95,
    circularity: 0.65,
    warmthIndex: 35,
    greenBlueIndex: -15,
    shellEdgeContrast: 24,
    internalTexture: 18,
    polarBrightnessRatio: 1.12,
    asymmetryIndex: 0.08,
    relativeSize: 0.02,
  });
  assert.equal(trichuris.classId, 1);
  assert.equal(trichuris.scientificName, 'Trichuris trichiura');
  assert.ok(trichuris.confidence >= 0.85);

  const giardia = classifyCandidateMorphology({
    aspectRatio: 1.38,
    circularity: 0.78,
    warmthIndex: -12,
    greenBlueIndex: 28,
    shellEdgeContrast: 20,
    internalTexture: 22,
    polarBrightnessRatio: 1.0,
    asymmetryIndex: 0.05,
    relativeSize: 0.012,
  });
  assert.equal(giardia.classId, 5);
  assert.equal(giardia.scientificName, 'Giardia intestinalis');

  const report = generateAutomatedDiagnosticReport([
    {
      label: trichuris.scientificName,
      classId: trichuris.classId,
      confidence: trichuris.confidence,
      morphologicalNote: trichuris.morphologicalNote,
    },
  ]);
  assert.equal(report.primarySpecies, 'Trichuris trichiura');
  assert.equal(report.primaryClassId, 1);
  assert.equal(report.automatedDecision, 'Accepted (True Positive)');
  assert.ok(report.automatedNotes.includes('Trichuris trichiura'));
});

test('botReply answers research-specific, species comparison, and live slideContext questions', () => {
  const ans = botReply('What are the 8 target species in Phase A?');
  assert.ok(ans.includes('Ascaris lumbricoides'));
  assert.ok(ans.includes('Entamoeba coli'));

  const comp = botReply('Compare Entamoeba histolytica and Entamoeba coli');
  assert.ok(comp.includes('Entamoeba histolytica'));
  assert.ok(comp.includes('Entamoeba coli'));

  const slideAns = botReply('Explain the current slide', {
    fileName: 'trichuris_saline_ref.png',
    stainEstimate: 'Saline Wet Mount (400×)',
    detections: [
      {
        label: 'Trichuris trichiura',
        classId: 1,
        confidence: 0.946,
        yoloLine: '1 0.500000 0.500000 0.140000 0.080000',
        morphologicalNote: 'Barrel-shaped egg with bipolar hyaline plugs.',
      },
    ],
  });
  assert.ok(slideAns.includes('trichuris_saline_ref.png'));
  assert.ok(slideAns.includes('Trichuris trichiura'));
  assert.ok(slideAns.includes('94.6%'));
});


