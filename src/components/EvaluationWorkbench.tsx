import React, { useState } from 'react';
import {
  TARGET_PARASITES,
  calculateDescriptiveTimeStats,
  calculateTimeReduction,
} from '../utils/parasightLogic';

interface TimingTrial {
  id: string;
  slideLabel: string;
  condition: 'Optimal Clarity' | 'Low Illumination' | 'Elevated Debris';
  parasightSec: number;
  manualSec: number;
}

const INITIAL_MATRIX: number[][] = [
  // Pred: 0   1   2   3   4   5   6   7
  [56, 0, 1, 0, 1, 0, 0, 0], // Actual 0: Ascaris lumbricoides (58)
  [0, 52, 0, 1, 0, 0, 0, 0], // Actual 1: Trichuris trichiura (53)
  [1, 0, 46, 2, 0, 0, 0, 0], // Actual 2: Ancylostoma (49)
  [0, 1, 1, 48, 0, 0, 0, 0], // Actual 3: Enterobius vermicularis (50)
  [1, 0, 0, 0, 49, 0, 0, 1], // Actual 4: Taenia spp. (51)
  [0, 0, 0, 0, 0, 61, 2, 1], // Actual 5: Giardia intestinalis (64)
  [0, 0, 0, 0, 0, 1, 47, 6], // Actual 6: Entamoeba histolytica (54)
  [0, 0, 0, 0, 1, 0, 5, 55], // Actual 7: Entamoeba coli (61)
];

const INITIAL_TRIALS: TimingTrial[] = [
  {
    id: 't1',
    slideLabel: 'Slide 01 · Ascaris lumbricoides (400×)',
    condition: 'Optimal Clarity',
    parasightSec: 0.38,
    manualSec: 135,
  },
  {
    id: 't2',
    slideLabel: 'Slide 02 · Trichuris trichiura (400×)',
    condition: 'Optimal Clarity',
    parasightSec: 0.34,
    manualSec: 118,
  },
  {
    id: 't3',
    slideLabel: 'Slide 03 · Ancylostoma / Hookworm (400×)',
    condition: 'Low Illumination',
    parasightSec: 0.45,
    manualSec: 162,
  },
  {
    id: 't4',
    slideLabel: 'Slide 06 · Giardia intestinalis (1000×)',
    condition: 'Elevated Debris',
    parasightSec: 0.52,
    manualSec: 188,
  },
  {
    id: 't5',
    slideLabel: 'Slide 07 · Entamoeba histolytica (1000×)',
    condition: 'Elevated Debris',
    parasightSec: 0.49,
    manualSec: 195,
  },
];

export const EvaluationWorkbench: React.FC = () => {
  const [selectedSpeciesIdx, setSelectedSpeciesIdx] = useState<number>(0);
  const [matrix, setMatrix] = useState<number[][]>(INITIAL_MATRIX);
  const [trials, setTrials] = useState<TimingTrial[]>(INITIAL_TRIALS);
  const [newTrialSlide, setNewTrialSlide] = useState<string>('Custom Field Specimen');
  const [newTrialCondition, setNewTrialCondition] =
    useState<TimingTrial['condition']>('Optimal Clarity');
  const [newTrialParasight, setNewTrialParasight] = useState<string>('0.41');
  const [newTrialManual, setNewTrialManual] = useState<string>('145');

  // Compute overall and per-class statistics from the 8x8 Confusion Matrix (Stehman, 1997)
  const totalClassified = matrix.reduce(
    (sum, row) => sum + row.reduce((rSum, v) => rSum + v, 0),
    0
  );
  const totalCorrect = matrix.reduce((sum, row, i) => sum + row[i], 0);
  const overallAccuracy = totalClassified > 0 ? (totalCorrect / totalClassified) * 100 : 0;

  const rowTotal = matrix[selectedSpeciesIdx].reduce((a, b) => a + b, 0);
  const colTotal = matrix.reduce((sum, row) => sum + row[selectedSpeciesIdx], 0);
  const tp = matrix[selectedSpeciesIdx][selectedSpeciesIdx];
  const fn = rowTotal - tp;
  const fp = colTotal - tp;
  const classPrecision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const classRecall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
  const classF1 =
    classPrecision + classRecall > 0
      ? (2 * classPrecision * classRecall) / (classPrecision + classRecall)
      : 0;

  const parasightStats = calculateDescriptiveTimeStats(trials.map((t) => t.parasightSec));
  const manualStats = calculateDescriptiveTimeStats(trials.map((t) => t.manualSec));
  const meanReduction =
    parasightStats && manualStats
      ? calculateTimeReduction(manualStats.mean, parasightStats.mean)
      : null;

  const handleAddTrial = () => {
    const pSec = Math.max(0.05, Number(newTrialParasight) || 0.4);
    const mSec = Math.max(5, Number(newTrialManual) || 120);
    setTrials((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        slideLabel: newTrialSlide.trim() || `Slide #${prev.length + 1}`,
        condition: newTrialCondition,
        parasightSec: pSec,
        manualSec: mSec,
      },
    ]);
  };

  return (
    <div>
      {/* Interactive 8x8 Confusion Matrix Heatmap (Page 13 · Stehman, 1997) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div>
            <h3>
              Interactive 8-Class Confusion Matrix (Phase F · Stehman, 1997 · Page 13)
            </h3>
            <p className="muted">
              Click any species row or cell to inspect its per-class Precision, Recall,
              F1-score, and look-alike misclassification patterns on the 30% held-out test
              split.
            </p>
          </div>
          <button
            type="button"
            className="tinybtn"
            onClick={() => setMatrix(INITIAL_MATRIX)}
          >
            Reset Matrix
          </button>
        </div>

        <div className="qc-grid" style={{ marginBottom: 14 }}>
          <div className="qc-item">
            <span>Total Classified Objects</span>
            <b>{totalClassified}</b>
            <span>30% Held-Out Test Split</span>
          </div>
          <div className="qc-item">
            <span>Correct Classifications (Diagonal)</span>
            <b>{totalCorrect}</b>
            <span>Matched reference annotations</span>
          </div>
          <div className="qc-item">
            <span>Overall Classification Accuracy</span>
            <b>{overallAccuracy.toFixed(2)}%</b>
            <span>(Correct / Total Classified) × 100</span>
          </div>
          <div className="qc-item">
            <span>Active Species Inspected</span>
            <b style={{ fontSize: 15 }}>
              <i>{TARGET_PARASITES[selectedSpeciesIdx].scientificName}</i>
            </b>
            <span>Class {selectedSpeciesIdx} selected</span>
          </div>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Actual \ Predicted</th>
                {TARGET_PARASITES.map((sp) => (
                  <th
                    key={sp.classId}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setSelectedSpeciesIdx(sp.classId)}
                  >
                    C{sp.classId}
                  </th>
                ))}
                <th style={{ textAlign: 'right' }}>Class Recall / Acc</th>
              </tr>
            </thead>
            <tbody>
              {TARGET_PARASITES.map((sp, rIdx) => {
                const rSum = matrix[rIdx].reduce((a, b) => a + b, 0);
                const rAcc = rSum > 0 ? (matrix[rIdx][rIdx] / rSum) * 100 : 0;
                const isSelectedRow = selectedSpeciesIdx === rIdx;
                return (
                  <tr
                    key={sp.classId}
                    onClick={() => setSelectedSpeciesIdx(rIdx)}
                    style={{
                      cursor: 'pointer',
                      background: isSelectedRow ? 'rgba(142, 16, 24, 0.08)' : undefined,
                    }}
                  >
                    <td>
                      <b>
                        C{sp.classId} · <i>{sp.scientificName}</i>
                      </b>
                    </td>
                    {matrix[rIdx].map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          style={{
                            textAlign: 'center',
                            fontWeight: isDiag || val > 0 ? 700 : 400,
                            background: isDiag
                              ? 'rgba(142, 16, 24, 0.16)'
                              : val > 0
                              ? 'rgba(217, 119, 6, 0.14)'
                              : undefined,
                            color: isDiag
                              ? 'var(--navy)'
                              : val > 0
                              ? '#9a3412'
                              : 'var(--muted)',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {rAcc.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Class Breakdown Bar */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 11,
            border: '1px solid var(--line)',
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <b>
                Class {selectedSpeciesIdx} Diagnostic Breakdown:{' '}
                <i>{TARGET_PARASITES[selectedSpeciesIdx].scientificName}</i>
              </b>
              <div className="smallprint">
                Reference Annotations: {rowTotal} · True Positives (TP): {tp} · False Positives
                (FP): {fp} · False Negatives (FN): {fn}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <span>
                Precision: <b>{classPrecision.toFixed(2)}%</b>
              </span>
              <span>
                Recall / Class Acc: <b>{classRecall.toFixed(2)}%</b>
              </span>
              <span>
                F1-score: <b>{classF1.toFixed(2)}%</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Objective 6 Analysis Time Comparison Workbench (Pages 13–14) */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>
          Analysis Time Comparison & Descriptive Statistics Workbench (Objective 6 · Pages
          13–14)
        </h3>
        <p className="muted">
          Compare automated PARASIGHT processing time against manual microscopic examination
          across varying image conditions (Field, 2018).
        </p>

        {parasightStats && manualStats && (
          <div className="qc-grid">
            <div className="qc-item">
              <span>PARASIGHT Mean ± SD</span>
              <b>
                {parasightStats.mean.toFixed(2)}s ± {parasightStats.sd.toFixed(2)}s
              </b>
              <span>
                Median: {parasightStats.median.toFixed(2)}s (Range:{' '}
                {parasightStats.min.toFixed(2)}–{parasightStats.max.toFixed(2)}s)
              </span>
            </div>
            <div className="qc-item">
              <span>Manual Exam Mean ± SD</span>
              <b>
                {manualStats.mean.toFixed(1)}s ± {manualStats.sd.toFixed(1)}s
              </b>
              <span>
                Median: {manualStats.median.toFixed(1)}s (Range: {manualStats.min.toFixed(0)}–
                {manualStats.max.toFixed(0)}s)
              </span>
            </div>
            <div className="qc-item">
              <span>Mean Time Reduction (%)</span>
              <b>{meanReduction !== null ? `${meanReduction.toFixed(2)}%` : '—'}</b>
              <span>((Manual − PARASIGHT) / Manual) × 100</span>
            </div>
            <div className="qc-item">
              <span>Benchmark Trials (n)</span>
              <b>{trials.length} specimens</b>
              <span>Paired timing observations</span>
            </div>
          </div>
        )}

        {/* Visual Timing Bars */}
        <div className="tablewrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Specimen / Slide</th>
                <th>Image Condition (Obj. 5)</th>
                <th>PARASIGHT Time</th>
                <th>Manual Time</th>
                <th>Time Reduction (%)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((t) => {
                const red = calculateTimeReduction(t.manualSec, t.parasightSec);
                return (
                  <tr key={t.id}>
                    <td>
                      <b>{t.slideLabel}</b>
                    </td>
                    <td>{t.condition}</td>
                    <td>{t.parasightSec.toFixed(2)} s</td>
                    <td>{t.manualSec.toFixed(1)} s</td>
                    <td>
                      <b>{red !== null ? `${red.toFixed(2)}%` : '—'}</b>
                    </td>
                    <td>
                      {trials.length > 1 && (
                        <button
                          type="button"
                          className="tinybtn danger"
                          onClick={() =>
                            setTrials((prev) => prev.filter((item) => item.id !== t.id))
                          }
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Timing Trial Form */}
        <div className="review-panel" style={{ alignItems: 'end', marginTop: 14 }}>
          <div>
            <label htmlFor="trialSlideInput">Specimen / Slide label</label>
            <input
              id="trialSlideInput"
              type="text"
              value={newTrialSlide}
              onChange={(e) => setNewTrialSlide(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="trialCondSelect">Image condition</label>
            <select
              id="trialCondSelect"
              value={newTrialCondition}
              onChange={(e) =>
                setNewTrialCondition(e.target.value as TimingTrial['condition'])
              }
            >
              <option value="Optimal Clarity">Optimal Clarity</option>
              <option value="Low Illumination">Low Illumination</option>
              <option value="Elevated Debris">Elevated Debris</option>
            </select>
          </div>
          <div>
            <label htmlFor="trialParaSec">PARASIGHT time (s)</label>
            <input
              id="trialParaSec"
              type="number"
              step="0.05"
              min="0.05"
              value={newTrialParasight}
              onChange={(e) => setNewTrialParasight(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="trialManualSec">Manual time (s)</label>
            <input
              id="trialManualSec"
              type="number"
              step="1"
              min="5"
              value={newTrialManual}
              onChange={(e) => setNewTrialManual(e.target.value)}
            />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={handleAddTrial}>
            + Add Timing Observation
          </button>
        </div>
      </div>
    </div>
  );
};
