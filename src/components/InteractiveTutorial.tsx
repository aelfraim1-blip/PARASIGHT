import React, { useState, useEffect, useRef } from 'react';
import { TARGET_PARASITES, classifyImageCondition } from '../utils/parasightLogic';
import { ParasiteSvgIcon } from './ParasiteSvgIcon';

export interface TutorialStep {
  stepNumber: number;
  shortTabTitle: string;
  badge: string;
  title: string;
  subtitle: string;
  plainSummary: string;
  easySteps: { title: string; detail: string }[];
  tipText: string;
  actionLabel: string;
  actionType:
    | 'home-atlas'
    | 'auto-classify-demo'
    | 'batch-scan'
    | 'dataset-matrix'
    | 'history'
    | 'finish';
}

const EASY_SPECIES_CLUES: Record<number, { clue: string; nickname: string }> = {
  0: {
    nickname: 'Giant Roundworm',
    clue: 'Thick bumpy ("mammillated") outer shell with a round central cell.',
  },
  1: {
    nickname: 'Whipworm',
    clue: 'Distinct football/lemon barrel shape with 2 clear plugs at both ends.',
  },
  2: {
    nickname: 'Hookworm',
    clue: 'Thin clear oval shell with 4 to 8 clustered cells inside and empty space around them.',
  },
  3: {
    nickname: 'Pinworm',
    clue: 'Flattened on one side like the letter "D", colorless double-layered shell.',
  },
  4: {
    nickname: 'Tapeworm',
    clue: 'Round dark-brown egg with thick bicycle-spoke lines ("radial striations") on the rim.',
  },
  5: {
    nickname: 'Giardia Protozoan',
    clue: 'Small smooth oval cyst with 2–4 nuclei and thin internal diagonal fibers.',
  },
  6: {
    nickname: 'Pathogenic Amoeba',
    clue: 'Small round cyst with up to 4 nuclei and rounded sausage-like bars inside.',
  },
  7: {
    nickname: 'Harmless Amoeba Look-Alike',
    clue: 'Larger round cyst with 5 to 8 nuclei and splinter-like internal bars.',
  },
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    shortTabTitle: 'Meet the 8 Parasites',
    badge: 'STEP 1 OF 6 · WHAT PARASIGHT DETECTS',
    title: 'Meet the 8 Target Intestinal Parasites',
    subtitle: 'See what the AI looks for under the microscope (5 Worms + 3 Protozoa)',
    plainSummary:
      'PARASIGHT is trained to spot 8 common intestinal parasites in stool microscope photos and tell them apart from harmless background dirt.',
    easySteps: [
      {
        title: '5 Worm Eggs (Helminths)',
        detail:
          'Includes Roundworm (Ascaris), Whipworm (Trichuris), Hookworm, Pinworm, and Tapeworm (Taenia).',
      },
      {
        title: '3 Microscopic Cysts (Protozoa)',
        detail:
          'Includes Giardia and two look-alike amoebas (Entamoeba histolytica & Entamoeba coli).',
      },
      {
        title: 'Try the Live Preview →',
        detail:
          'Click any parasite button in the Live Microscope Preview on the right to see its shape and key visual clue!',
      },
    ],
    tipText:
      'You do not need to memorize Latin names—PARASIGHT shows both the common name and the exact shape clue for every detection.',
    actionLabel: 'Open Full 8-Species Atlas on Home →',
    actionType: 'home-atlas',
  },
  {
    stepNumber: 2,
    shortTabTitle: 'Auto AI Scan',
    badge: 'STEP 2 OF 6 · ZERO-CLICK AI DETECTION',
    title: 'Watch Automatic AI Detection & Labeling',
    subtitle: 'Upload a slide or pick a sample—the AI boxes and names parasites automatically',
    plainSummary:
      'As soon as you load a photo, PARASIGHT scans the slide in under 2 seconds, draws boxes around parasites, ignores harmless debris, and writes the lab report.',
    easySteps: [
      {
        title: 'Load Any Slide Photo',
        detail:
          'Drop your own microscope image or click one of the 8 built-in sample slides on the Analyze page.',
      },
      {
        title: 'AI Boxes & Classifies Automatically',
        detail:
          'Green/gold boxes snap onto each parasite with its species name and confidence score (e.g., 94.8%).',
      },
      {
        title: 'Instant Clinical Summary',
        detail:
          'The system automatically fills out the species count, stain type, and diagnostic explanation.',
      },
    ],
    tipText:
      'Watch the Live AI Scanner on the right sweep across the slide, ignore brown debris specks, and lock onto the 2 real parasites!',
    actionLabel: '⚡ Try It Live: Auto-Scan Whipworm Slide Now →',
    actionType: 'auto-classify-demo',
  },
  {
    stepNumber: 3,
    shortTabTitle: 'Draw & Inspect Boxes',
    badge: 'STEP 3 OF 6 · INTERACTIVE MICROSCOPE STAGE',
    title: 'Click Any Box or Drag to Draw Your Own',
    subtitle: 'Draw a box around any object and watch the AI classify it on the spot',
    plainSummary:
      'You are always in control: click any AI box to inspect it closely, or drag your mouse across the slide to draw a new box and let the AI identify what is inside.',
    easySteps: [
      {
        title: 'Click a Box to Inspect',
        detail:
          'Clicking any box on the microscope slide highlights it in gold and explains why the AI chose that species.',
      },
      {
        title: 'Drag to Draw a New Box',
        detail:
          'Turn on "+ Draw YOLO Box" and drag across any spot on the slide. The AI immediately classifies the shape inside your box!',
      },
      {
        title: 'Try Drawing in the Live Preview →',
        detail:
          'Click and drag your mouse directly inside the microscope preview on the right (or click a specimen) to test live box drawing!',
      },
    ],
    tipText:
      'If the AI ever mislabels a tricky look-alike, you can also change its species from a simple dropdown menu.',
    actionLabel: 'Open Interactive Microscope Stage Live →',
    actionType: 'auto-classify-demo',
  },
  {
    stepNumber: 4,
    shortTabTitle: 'Blur & Light Check',
    badge: 'STEP 4 OF 6 · PHOTO QUALITY CHECKER',
    title: 'See How Blur & Lighting Affect the Microscope',
    subtitle: 'PARASIGHT warns you if a photo is too blurry, too dark, or full of debris',
    plainSummary:
      'Out-of-focus or dark microscope photos can hide parasites. PARASIGHT automatically checks your photo’s sharpness and brightness before you trust the result.',
    easySteps: [
      {
        title: 'Sharpness (Focus) Check',
        detail:
          'Checks if the parasite shell edges are crisp enough to see internal details clearly.',
      },
      {
        title: 'Lighting (Brightness) Check',
        detail:
          'Makes sure the microscope lamp isn’t too dim or washing out the slide with bright glare.',
      },
      {
        title: 'Move the Sliders in the Live Preview →',
        detail:
          'Drag the Blur and Brightness sliders on the right to see the microscope slide blur in real time and watch the quality badge react!',
      },
    ],
    tipText:
      'Try clicking the "Blurry Slide" button in the preview on the right to see how the warning banner alerts the lab technician.',
    actionLabel: 'Test Optical Sliders on Real Stage →',
    actionType: 'auto-classify-demo',
  },
  {
    stepNumber: 5,
    shortTabTitle: 'Speed & Accuracy',
    badge: 'STEP 5 OF 6 · AI VS. MANUAL COMPARISON',
    title: 'Compare AI Speed & Accuracy vs. Manual Counting',
    subtitle: 'See how PARASIGHT saves 98%+ of lab time and tracks accuracy across all 8 species',
    plainSummary:
      'Searching a stool slide by hand under a microscope takes 2 to 5 minutes. PARASIGHT scans the slide in a fraction of a second and tracks accuracy in a visual scorecard.',
    easySteps: [
      {
        title: '98%+ Faster Slide Screening',
        detail:
          'Compares Manual Microscope Time (~135 sec) against PARASIGHT AI Time (~0.2 sec) automatically.',
      },
      {
        title: 'Simple 4-Part Accuracy Scorecard',
        detail:
          'Tracks Found Parasites (True Positives), Ignored Debris (True Negatives), False Alarms, and Missed items.',
      },
      {
        title: '8×8 Species Accuracy Grid',
        detail:
          'Shows which parasites are easiest to spot and which look-alike species need extra attention.',
      },
    ],
    tipText:
      'Watch the Live Speed Race on the right to see how fast the AI finishes compared to manual microscope examination!',
    actionLabel: 'Open Accuracy Scorecard & Dataset Tab →',
    actionType: 'dataset-matrix',
  },
  {
    stepNumber: 6,
    shortTabTitle: 'Batch Scan & Save',
    badge: 'STEP 6 OF 6 · 1-CLICK BATCH & EXPORT',
    title: 'Scan All 8 Slides at Once & Export Lab Reports',
    subtitle: 'Run a full 8-species demo in one click and reopen this tutorial anytime',
    plainSummary:
      'Want to see all 8 parasite species analyzed back-to-back? Use the 1-Click Batch Scanner to populate your History tab, then download images or reports anytime.',
    easySteps: [
      {
        title: '1-Click 8-Species Batch Scan',
        detail:
          'Scans all 8 reference slides automatically and saves every annotated result to your History tab.',
      },
      {
        title: 'Download Annotated Photos & Reports',
        detail:
          'Export labeled PNG microscope photos, Excel/CSV spreadsheets, or YOLO coordinate text files.',
      },
      {
        title: 'Reopen Tutorial Anytime',
        detail:
          'This tutorial is always saved in the "✦ Tutorial" tab on the left sidebar whenever you need a refresher!',
      },
    ],
    tipText:
      'Click "⚡ Run Real 8-Species Batch Scan Now" below to watch the real workbench process all 8 slides automatically!',
    actionLabel: '⚡ Run Real 8-Species Batch Scan Now →',
    actionType: 'batch-scan',
  },
];

interface InteractiveTutorialProps {
  mode: 'modal' | 'page';
  currentStepIndex: number;
  onSelectStep: (idx: number) => void;
  onCloseModal?: () => void;
  onTriggerAction: (actionType: TutorialStep['actionType'], stepIdx: number) => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  mode,
  currentStepIndex,
  onSelectStep,
  onCloseModal,
  onTriggerAction,
}) => {
  const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];

  // Step 1 Live Preview State: 8-Species Live Microscope Viewer
  const [sandboxSpeciesIdx, setSandboxSpeciesIdx] = useState<number>(1); // default Whipworm
  const [autoCycleSpecies, setAutoCycleSpecies] = useState<boolean>(true);

  // Step 2 Live Preview State: Animated AI Scanner Stage (0 = scanning, 1 = filtering debris, 2 = boxes locked)
  const [scanPhase, setScanPhase] = useState<number>(2);
  const [sandboxSelectedBox, setSandboxSelectedBox] = useState<number>(0);

  // Step 3 Live Preview State: Interactive Click/Drag Box Drawing on Mini Microscope
  const [drawnBox, setDrawnBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    matchedIdx: number;
  }>({
    x: 14,
    y: 22,
    w: 28,
    h: 52,
    matchedIdx: 0,
  });
  const [isDrawingPreview, setIsDrawingPreview] = useState<boolean>(false);
  const [drawStartPt, setDrawStartPt] = useState<{ x: number; y: number } | null>(null);
  const step3StageRef = useRef<HTMLDivElement | null>(null);

  // Step 4 Live Preview State: Focus Blur & Illumination Simulator
  const [sandboxBlur, setSandboxBlur] = useState<number>(0);
  const [sandboxBrightness, setSandboxBrightness] = useState<number>(100);

  // Step 5 Live Preview State: Animated Speed Race (AI vs Manual)
  const [raceTick, setRaceTick] = useState<number>(100);

  // Step 6 Live Preview State: 8-Slide Batch Conveyor Belt
  const [batchProgressCount, setBatchProgressCount] = useState<number>(8);

  // Step 1 Auto-Cycle effect
  useEffect(() => {
    if (step.stepNumber !== 1 || !autoCycleSpecies) return;
    const timer = window.setInterval(() => {
      setSandboxSpeciesIdx((prev) => (prev + 1) % TARGET_PARASITES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [step.stepNumber, autoCycleSpecies]);

  // Step 2: Immediately display the auto-detected boxes on step entry; user can click "↻ Replay Live Scan" anytime
  useEffect(() => {
    if (step.stepNumber === 2) {
      setScanPhase(2);
    }
  }, [step.stepNumber]);

  // Trigger Replay for Step 2 Scanner
  const handleReplayStep2Scan = () => {
    setScanPhase(0);
    window.setTimeout(() => setScanPhase(1), 750);
    window.setTimeout(() => setScanPhase(2), 1500);
  };

  // Trigger Replay for Step 5 Speed Race
  const handleReplaySpeedRace = () => {
    setRaceTick(0);
    let current = 0;
    const id = window.setInterval(() => {
      current += 10;
      if (current >= 100) {
        setRaceTick(100);
        window.clearInterval(id);
      } else {
        setRaceTick(current);
      }
    }, 120);
  };

  // Trigger Replay for Step 6 Batch Scan Preview
  const handleReplayBatchPreview = () => {
    setBatchProgressCount(0);
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      if (count >= 8) {
        setBatchProgressCount(8);
        window.clearInterval(id);
      } else {
        setBatchProgressCount(count);
      }
    }, 260);
  };

  const activeSandboxSpecies = TARGET_PARASITES[sandboxSpeciesIdx] || TARGET_PARASITES[0];
  const activeClue = EASY_SPECIES_CLUES[activeSandboxSpecies.classId] || EASY_SPECIES_CLUES[0];

  const simulatedFocus = Math.max(18, Math.round(215 / (1 + sandboxBlur * 0.85)));
  const simulatedBrightness = Math.min(
    255,
    Math.max(15, Math.round((198 * sandboxBrightness) / 100))
  );
  const simulatedCondition = classifyImageCondition(simulatedFocus, simulatedBrightness, 26, 2);
  const simulatedConfidence = Math.max(
    51,
    Math.min(
      97,
      Math.round(96 - sandboxBlur * 8.2 - Math.abs(100 - sandboxBrightness) * 0.25)
    )
  );

  // Step 3 Interactive Mouse Drag Handlers on the Live Preview Stage
  const step3Specimens = [
    {
      idx: 0,
      classId: 1,
      name: 'Trichuris trichiura (Whipworm)',
      conf: '96.4%',
      leftPct: 28,
      topPct: 48,
      box: { x: 14, y: 22, w: 28, h: 52 },
      reason: 'Lemon/barrel shape with 2 polar plugs detected at opposite ends.',
    },
    {
      idx: 1,
      classId: 0,
      name: 'Ascaris lumbricoides (Roundworm)',
      conf: '94.8%',
      leftPct: 60,
      topPct: 46,
      box: { x: 46, y: 18, w: 28, h: 56 },
      reason: 'Golden-brown oval with bumpy mammillated outer shell.',
    },
    {
      idx: 2,
      classId: 5,
      name: 'Giardia intestinalis (Protozoan)',
      conf: '91.2%',
      leftPct: 84,
      topPct: 54,
      box: { x: 74, y: 30, w: 20, h: 46 },
      reason: 'Compact oval cyst with paired nuclei and internal fibrils.',
    },
  ];

  const getRelativePct = (clientX: number, clientY: number) => {
    const rect = step3StageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleStep3MouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getRelativePct(e.clientX, e.clientY);
    setIsDrawingPreview(true);
    setDrawStartPt(pt);
    setDrawnBox((prev) => ({
      ...prev,
      x: pt.x,
      y: pt.y,
      w: 4,
      h: 4,
    }));
  };

  const handleStep3MouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingPreview || !drawStartPt) return;
    const pt = getRelativePct(e.clientX, e.clientY);
    const x = Math.min(drawStartPt.x, pt.x);
    const y = Math.min(drawStartPt.y, pt.y);
    const w = Math.max(8, Math.abs(pt.x - drawStartPt.x));
    const h = Math.max(12, Math.abs(pt.y - drawStartPt.y));
    const centerX = x + w / 2;
    // Match closest specimen on the slide
    let closestIdx = 0;
    let bestDist = 999;
    step3Specimens.forEach((sp) => {
      const d = Math.abs(centerX - sp.leftPct);
      if (d < bestDist) {
        bestDist = d;
        closestIdx = sp.idx;
      }
    });
    setDrawnBox({ x, y, w, h, matchedIdx: closestIdx });
  };

  const handleStep3MouseUp = () => {
    if (!isDrawingPreview) return;
    setIsDrawingPreview(false);
    setDrawStartPt(null);
  };

  const renderLivePreviewPane = () => {
    // STEP 1 LIVE PREVIEW: Interactive Microscope Slide Viewer for all 8 Species
    if (step.stepNumber === 1) {
      return (
        <div className="live-preview-window">
          <div className="live-preview-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-preview-dots" aria-hidden="true">
                <i style={{ background: '#ff5f56' }} />
                <i style={{ background: '#ffbd2e' }} />
                <i style={{ background: '#27c93f' }} />
              </span>
              <b>LIVE MICROSCOPE PREVIEW · 400× WET MOUNT</b>
            </div>
            <button
              type="button"
              onClick={() => setAutoCycleSpecies((v) => !v)}
              style={{
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {autoCycleSpecies ? '⏸ Pause Auto-Preview' : '▶ Auto-Cycle 8 Species'}
            </button>
          </div>

          {/* Simulated Microscope Slide Field */}
          <div className="live-microscope-field">
            {/* Subtle Eyepiece Reticle & Debris */}
            <div
              style={{
                position: 'absolute',
                inset: 10,
                border: '1px dashed rgba(92, 54, 18, 0.28)',
                borderRadius: 10,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 14,
                background: 'rgba(28, 12, 6, 0.76)',
                color: '#fff',
                padding: '4px 9px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Class {activeSandboxSpecies.classId} · {activeSandboxSpecies.group} ({activeClue.nickname})
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 14,
                fontSize: 11,
                fontWeight: 700,
                color: '#4e2f11',
                background: 'rgba(255,255,255,0.75)',
                padding: '2px 8px',
                borderRadius: 5,
              }}
            >
              ├── {activeSandboxSpecies.sizeRangeUm} ──┤
            </div>

            {/* Harmless background debris specks for realism */}
            <span
              style={{
                position: 'absolute',
                left: '16%',
                top: '68%',
                width: 14,
                height: 9,
                borderRadius: '50%',
                background: 'rgba(110, 78, 38, 0.32)',
              }}
              title="Harmless fecal debris speck"
            />
            <span
              style={{
                position: 'absolute',
                right: '14%',
                top: '26%',
                width: 11,
                height: 11,
                borderRadius: '40%',
                background: 'rgba(110, 78, 38, 0.25)',
              }}
            />

            {/* Centered Parasite Specimen with Animated Detection Frame + Visual Clue Callout */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '0 18px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: 10,
                  borderRadius: 12,
                  border: '2.5px solid #16a34a',
                  background: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 0 0 4px rgba(22, 163, 74, 0.18)',
                  transition: 'all 0.25s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: -2,
                    background: '#16a34a',
                    color: '#fff',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✓ {activeSandboxSpecies.scientificName} ({activeSandboxSpecies.sizeRangeUm})
                </span>
                <ParasiteSvgIcon classId={activeSandboxSpecies.classId} size={94} />
              </div>

              {/* Plain-English Visual Clue Bubble right inside the microscope */}
              <div
                style={{
                  maxWidth: 230,
                  background: 'rgba(255, 255, 255, 0.94)',
                  color: '#231416',
                  padding: '10px 12px',
                  borderRadius: 10,
                  borderLeft: '4px solid #8e1018',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#8e1018',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  ← How AI Recognizes It
                </div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>
                  {activeSandboxSpecies.commonName} ({activeSandboxSpecies.stage})
                </div>
                <div style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.45, color: '#4c383b' }}>
                  {activeClue.clue}
                </div>
              </div>
            </div>
          </div>

          {/* Clickable 8-Species Selector Strip */}
          <div style={{ padding: 12, background: 'var(--card)' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>👇 CLICK ANY PARASITE BELOW TO PREVIEW ON SLIDE:</span>
              <span>
                {sandboxSpeciesIdx + 1} of 8 selected
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {TARGET_PARASITES.map((sp, idx) => (
                <button
                  key={sp.classId}
                  type="button"
                  className={`tinybtn ${sandboxSpeciesIdx === idx ? 'selected' : ''}`}
                  onClick={() => {
                    setAutoCycleSpecies(false);
                    setSandboxSpeciesIdx(idx);
                  }}
                  style={{
                    padding: '6px 8px',
                    fontSize: 11,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{sp.scientificName.split(' ')[0]}</span>
                  <span style={{ fontSize: 9.5, opacity: 0.8 }}>
                    {EASY_SPECIES_CLUES[sp.classId]?.nickname}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // STEP 2 LIVE PREVIEW: Animated AI Laser Scan + Auto-Classification + Auto Report
    if (step.stepNumber === 2) {
      const demoBoxes = [
        {
          id: 0,
          label: 'Taenia spp. (Tapeworm Egg)',
          shortLabel: 'Taenia spp. 93.8%',
          classId: 4,
          conf: '93.8%',
          left: '16%',
          top: '22%',
          note: 'Thick dark-brown shell with spoke-like radial lines.',
        },
        {
          id: 1,
          label: 'Entamoeba coli (Amoeba Cyst)',
          shortLabel: 'E. coli cyst 88.4%',
          classId: 7,
          conf: '88.4%',
          left: '58%',
          top: '26%',
          note: 'Round cyst containing multiple internal nuclei.',
        },
      ];
      const activeBox = demoBoxes[sandboxSelectedBox] || demoBoxes[0];

      return (
        <div className="live-preview-window">
          <div className="live-preview-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-preview-dots" aria-hidden="true">
                <i style={{ background: '#ff5f56' }} />
                <i style={{ background: '#ffbd2e' }} />
                <i style={{ background: '#27c93f' }} />
              </span>
              <b>LIVE AI AUTO-SCANNER PREVIEW</b>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleReplayStep2Scan}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ↻ Replay Live Scan
              </button>
            </div>
          </div>

          {/* Animated Microscope Field */}
          <div className="live-microscope-field">
            {/* Laser Sweep Line */}
            {scanPhase < 2 && <div className="tutorial-laser-line" />}

            {/* Status Pill */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 12,
                zIndex: 6,
                background:
                  scanPhase === 0 ? '#b45309' : scanPhase === 1 ? '#1d4ed8' : '#15803d',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              {scanPhase === 0 && '⏳ Step 1/3: Scanning microscope photo...'}
              {scanPhase === 1 && '🔍 Step 2/3: Ignoring fecal debris & matching species...'}
              {scanPhase === 2 && '✓ Step 3/3: 2 Parasites Auto-Classified & Labeled!'}
            </div>

            {/* Harmless Debris Specks with "Ignored" tag during scan */}
            <div
              style={{
                position: 'absolute',
                left: '44%',
                top: '68%',
                padding: '3px 6px',
                borderRadius: 6,
                border: scanPhase >= 1 ? '1px dashed rgba(120,50,50,0.5)' : 'none',
                fontSize: 10,
                color: '#5a381e',
                background: 'rgba(255,255,255,0.55)',
              }}
            >
              ● Debris {scanPhase >= 1 ? '(Ignored ✓)' : ''}
            </div>

            {/* Detected Parasite Boxes */}
            {demoBoxes.map((b, idx) => {
              const isSel = sandboxSelectedBox === idx;
              const showBox = scanPhase >= 1;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSandboxSelectedBox(idx)}
                  style={{
                    position: 'absolute',
                    left: b.left,
                    top: b.top,
                    padding: 8,
                    borderRadius: 10,
                    background: isSel
                      ? 'rgba(250, 204, 21, 0.22)'
                      : 'rgba(255, 255, 255, 0.25)',
                    border: showBox
                      ? isSel
                        ? '3px solid #eab308'
                        : '2.5px solid #16a34a'
                      : '1px dashed rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    transform: showBox ? 'scale(1)' : 'scale(0.94)',
                  }}
                  title="Click box to inspect"
                >
                  {showBox && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -20,
                        left: -2,
                        background: isSel ? '#ca8a04' : '#16a34a',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{idx + 1} {b.shortLabel}
                    </span>
                  )}
                  <ParasiteSvgIcon classId={b.classId} size={74} />
                </button>
              );
            })}
          </div>

          {/* Live Auto-Generated Report Preview Footer */}
          <div style={{ padding: 12, background: 'var(--card)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--navy)' }}>
                📋 AUTO-GENERATED LAB REPORT (CLICK A BOX ON SLIDE TO INSPECT):
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {demoBoxes.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`tinybtn ${sandboxSelectedBox === idx ? 'selected' : ''}`}
                    onClick={() => setSandboxSelectedBox(idx)}
                    style={{ padding: '4px 8px', fontSize: 11 }}
                  >
                    Box #{idx + 1}: {b.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--line)',
                fontSize: 12,
              }}
            >
              <b>Selected Box #{sandboxSelectedBox + 1}:</b> <i>{activeBox.label}</i> —{' '}
              <span style={{ color: '#15803d', fontWeight: 700 }}>
                Confidence {activeBox.conf} (Verified True Positive)
              </span>
              <div className="smallprint" style={{ marginTop: 3 }}>
                <b>Why AI Chose This:</b> {activeBox.note}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // STEP 3 LIVE PREVIEW: Interactive Click-and-Drag Box Drawing Sandbox
    if (step.stepNumber === 3) {
      const matchedSp = step3Specimens[drawnBox.matchedIdx] || step3Specimens[0];
      return (
        <div className="live-preview-window">
          <div className="live-preview-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-preview-dots" aria-hidden="true">
                <i style={{ background: '#ff5f56' }} />
                <i style={{ background: '#ffbd2e' }} />
                <i style={{ background: '#27c93f' }} />
              </span>
              <b>INTERACTIVE SANDBOX · DRAG MOUSE TO DRAW A BOX</b>
            </div>
            <span style={{ fontSize: 11, opacity: 0.9 }}>Cursor: ✚ Crosshair Mode</span>
          </div>

          <div
            ref={step3StageRef}
            className="live-microscope-field"
            style={{ cursor: 'crosshair' }}
            onMouseDown={handleStep3MouseDown}
            onMouseMove={handleStep3MouseMove}
            onMouseUp={handleStep3MouseUp}
            onMouseLeave={handleStep3MouseUp}
          >
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 10,
                zIndex: 6,
                background: 'rgba(28, 12, 6, 0.8)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                pointerEvents: 'none',
              }}
            >
              🖱️ Click & Drag anywhere on this slide (or click a parasite below)
            </div>

            {/* 3 Specimens on the Slide */}
            {step3Specimens.map((sp) => (
              <div
                key={sp.idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawnBox({ ...sp.box, matchedIdx: sp.idx });
                }}
                style={{
                  position: 'absolute',
                  left: `${sp.leftPct}%`,
                  top: `${sp.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  padding: 4,
                }}
                title={`Click or drag a box around ${sp.name}`}
              >
                <ParasiteSvgIcon classId={sp.classId} size={68} />
              </div>
            ))}

            {/* User's Drawn Bounding Box */}
            <div
              style={{
                position: 'absolute',
                left: `${drawnBox.x}%`,
                top: `${drawnBox.y}%`,
                width: `${drawnBox.w}%`,
                height: `${drawnBox.h}%`,
                border: '2.5px dashed #eab308',
                background: 'rgba(250, 204, 21, 0.18)',
                borderRadius: 8,
                pointerEvents: 'none',
                boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.2)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -22,
                  left: -2,
                  background: '#ca8a04',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                ⚡ Auto-Classified: {matchedSp.name.split(' ')[0]} ({matchedSp.conf})
              </span>
            </div>
          </div>

          <div style={{ padding: 12, background: 'var(--card)' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                Quick-Box Preset:
              </span>
              {step3Specimens.map((sp) => (
                <button
                  key={sp.idx}
                  type="button"
                  className={`tinybtn ${drawnBox.matchedIdx === sp.idx ? 'selected' : ''}`}
                  onClick={() => setDrawnBox({ ...sp.box, matchedIdx: sp.idx })}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  Box Specimen #{sp.idx + 1} ({sp.name.split(' ')[0]})
                </button>
              ))}
            </div>
            <div
              style={{
                padding: '8px 11px',
                borderRadius: 8,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--line)',
                fontSize: 12,
              }}
            >
              <b>⚡ Drawn Box Result:</b> <i>{matchedSp.name}</i> ({matchedSp.conf}) —{' '}
              <span className="smallprint">{matchedSp.reason}</span>
            </div>
          </div>
        </div>
      );
    }

    // STEP 4 LIVE PREVIEW: Focus Blur & Lighting Simulator with Visual Microscope Effect
    if (step.stepNumber === 4) {
      const isGoodQuality = sandboxBlur <= 1.0 && sandboxBrightness >= 75 && sandboxBrightness <= 125;
      return (
        <div className="live-preview-window">
          <div className="live-preview-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-preview-dots" aria-hidden="true">
                <i style={{ background: '#ff5f56' }} />
                <i style={{ background: '#ffbd2e' }} />
                <i style={{ background: '#27c93f' }} />
              </span>
              <b>LIVE MICROSCOPE FOCUS & LIGHTING SIMULATOR</b>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                type="button"
                onClick={() => {
                  setSandboxBlur(0);
                  setSandboxBrightness(100);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 10.5,
                  cursor: 'pointer',
                }}
              >
                ✨ Sharp Slide
              </button>
              <button
                type="button"
                onClick={() => {
                  setSandboxBlur(3.5);
                  setSandboxBrightness(100);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 10.5,
                  cursor: 'pointer',
                }}
              >
                🌫️ Blurry Slide
              </button>
              <button
                type="button"
                onClick={() => {
                  setSandboxBlur(0.5);
                  setSandboxBrightness(45);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 10.5,
                  cursor: 'pointer',
                }}
              >
                🌑 Too Dark
              </button>
            </div>
          </div>

          <div
            className="live-microscope-field"
            style={{
              filter: `blur(${sandboxBlur}px) brightness(${sandboxBrightness}%)`,
              transition: 'filter 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: `2.5px solid ${isGoodQuality ? '#16a34a' : '#d97706'}`,
                background: 'rgba(255,255,255,0.3)',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -22,
                  left: -2,
                  background: isGoodQuality ? '#16a34a' : '#d97706',
                  color: '#fff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Ascaris lumbricoides · Confidence {simulatedConfidence}%
              </span>
              <ParasiteSvgIcon classId={0} size={96} />
            </div>
          </div>

          {/* Sliders & Traffic-Light Status Bar */}
          <div style={{ padding: 12, background: 'var(--card)' }}>
            <div
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                marginBottom: 10,
                fontSize: 12,
                fontWeight: 700,
                background: isGoodQuality ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.15)',
                color: isGoodQuality ? '#15803d' : '#b45309',
                border: `1px solid ${isGoodQuality ? '#16a34a' : '#d97706'}`,
              }}
            >
              {isGoodQuality
                ? `🟢 CLEAR PHOTO (${simulatedCondition.clarityLabel}) — Ready for reliable diagnosis!`
                : `🟠 PHOTO QUALITY WARNING (${simulatedCondition.clarityLabel}, ${simulatedCondition.illuminationLabel}) — Re-adjust microscope focus or lamp!`}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <span>🔬 Focus Blur Knob:</span>
                  <b>{sandboxBlur === 0 ? 'Sharp (0 px)' : `Blurry (${sandboxBlur} px)`}</b>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={sandboxBlur}
                  onChange={(e) => setSandboxBlur(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8e1018' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <span>💡 Microscope Lamp Light:</span>
                  <b>{sandboxBrightness}%</b>
                </label>
                <input
                  type="range"
                  min={40}
                  max={145}
                  step={5}
                  value={sandboxBrightness}
                  onChange={(e) => setSandboxBrightness(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8e1018' }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // STEP 5 LIVE PREVIEW: Speed Race & Plain-English Accuracy Scorecard
    if (step.stepNumber === 5) {
      return (
        <div className="live-preview-window">
          <div className="live-preview-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-preview-dots" aria-hidden="true">
                <i style={{ background: '#ff5f56' }} />
                <i style={{ background: '#ffbd2e' }} />
                <i style={{ background: '#27c93f' }} />
              </span>
              <b>LIVE SPEED & ACCURACY COMPARISON</b>
            </div>
            <button
              type="button"
              onClick={handleReplaySpeedRace}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ▶ Run Speed Race
            </button>
          </div>

          <div style={{ padding: 14, background: 'var(--card)', flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              ⏱️ SLIDE ANALYSIS TIME RACE (99.8% TIME SAVED):
            </div>

            {/* PARASIGHT AI Bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <b>⚡ PARASIGHT Automated AI Scan</b>
                <b style={{ color: '#15803d' }}>0.18 seconds (Done!)</b>
              </div>
              <div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div
                  style={{
                    width: `${Math.min(100, raceTick * 2.5)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #15803d, #22c55e)',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            </div>

            {/* Manual Counting Bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>🔬 Manual Microscope Exam (By Hand)</span>
                <span className="muted">135.0 seconds (2 min 15 sec)</span>
              </div>
              <div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div
                  style={{
                    width: `${Math.max(6, Math.round(raceTick * 0.22))}%`,
                    height: '100%',
                    background: '#9ca3af',
                    transition: 'width 0.12s linear',
                  }}
                />
              </div>
            </div>

            {/* Simple 4-Card Visual Accuracy Guide */}
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              📊 HOW ACCURACY IS MEASURED (480 TEST OBSERVATIONS):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="qc-item" style={{ padding: 9 }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Correctly Found (TP)</span>
                <b style={{ fontSize: 16 }}>142 parasites</b>
                <span>Real parasites boxed & named</span>
              </div>
              <div className="qc-item" style={{ padding: 9 }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Ignored Debris (TN)</span>
                <b style={{ fontSize: 16 }}>319 clean fields</b>
                <span>Harmless dirt safely ignored</span>
              </div>
              <div className="qc-item" style={{ padding: 9 }}>
                <span style={{ color: '#b45309', fontWeight: 700 }}>⚠ False Alarms (FP)</span>
                <b style={{ fontSize: 16 }}>8 debris specks</b>
                <span>Dirt mistaken for a parasite</span>
              </div>
              <div className="qc-item" style={{ padding: 9 }}>
                <span style={{ color: '#b45309', fontWeight: 700 }}>⚠ Missed (FN)</span>
                <b style={{ fontSize: 16 }}>11 blurry ova</b>
                <span>Hidden by heavy blur/debris</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // STEP 6 LIVE PREVIEW: 8-Slide Batch Auto-Scanner Conveyor Preview
    return (
      <div className="live-preview-window">
        <div className="live-preview-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-preview-dots" aria-hidden="true">
              <i style={{ background: '#ff5f56' }} />
              <i style={{ background: '#ffbd2e' }} />
              <i style={{ background: '#27c93f' }} />
            </span>
            <b>LIVE 8-SPECIES BATCH SCANNER PREVIEW</b>
          </div>
          <button
            type="button"
            onClick={handleReplayBatchPreview}
            style={{
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ↻ Simulate Batch Scan
          </button>
        </div>

        <div style={{ padding: 12, background: 'var(--card)', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <b>
              Batch Progress: {batchProgressCount} of 8 Species Slides Auto-Classified
            </b>
            <span className="badge">
              {batchProgressCount === 8 ? '✓ Saved to History' : 'Scanning...'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TARGET_PARASITES.map((sp, idx) => {
              const done = idx < batchProgressCount;
              return (
                <div
                  key={sp.classId}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: `1.5px solid ${done ? '#16a34a' : 'var(--line)'}`,
                    background: done ? 'rgba(22, 163, 74, 0.06)' : 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    opacity: done ? 1 : 0.45,
                  }}
                >
                  <ParasiteSvgIcon classId={sp.classId} size={42} />
                  <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4 }}>
                    {sp.scientificName.split(' ')[0]}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: done ? '#15803d' : 'var(--muted)',
                      fontWeight: 700,
                    }}
                  >
                    {done ? `✓ ${sp.stage}` : 'Waiting...'}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 10,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--line)',
              fontSize: 11.5,
            }}
          >
            💡 <b>Ready to try it for real?</b> Click the red{' '}
            <b>&ldquo;⚡ Run Real 8-Species Batch Scan Now →&rdquo;</b> button below to run all 8
            slides in the live workspace!
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <div className={mode === 'modal' ? 'tutorial-modal-card' : 'card'}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          borderBottom: '1px solid var(--line)',
          paddingBottom: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span className="badge">{step.badge}</span>
            <span className="smallprint mono">
              Interactive Live Preview · Saved in &ldquo;✦ Tutorial&rdquo; Tab
            </span>
          </div>
          <h2 style={{ margin: 0 }}>{step.title}</h2>
          <p className="muted" style={{ margin: '3px 0 0' }}>
            {step.subtitle}
          </p>
        </div>

        {mode === 'modal' && onCloseModal && (
          <button
            type="button"
            className="secondary"
            onClick={onCloseModal}
            style={{ padding: '7px 12px', fontSize: 12 }}
          >
            ✕ Close (Reopen Anytime in &ldquo;Tutorial&rdquo; Tab)
          </button>
        )}
      </div>

      {/* Step Selector Pills */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 16,
        }}
      >
        {TUTORIAL_STEPS.map((s, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isDone = idx < currentStepIndex;
          return (
            <button
              key={s.stepNumber}
              type="button"
              className={`tinybtn ${isCurrent ? 'selected' : ''}`}
              onClick={() => onSelectStep(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '7px 10px',
                textAlign: 'left',
                borderColor: isDone ? '#8e1018' : undefined,
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 700 }}>
                {isDone ? '✓ ' : ''}STEP {s.stepNumber}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                }}
              >
                {s.shortTabTitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Split: Easy 3-Step Guide (Left) + Interactive Live Preview Screen (Right) */}
      <div className="tutorial-live-split">
        {/* Left Column: Plain-English 1-2-3 Guide */}
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              IN PLAIN ENGLISH · HOW THIS WORKS
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--ink)',
                margin: '0 0 14px',
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              {step.plainSummary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {step.easySteps.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '9px 11px',
                    borderRadius: 10,
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span className="tutorial-step-num">{i + 1}</span>
                  <div>
                    <b style={{ fontSize: 12.5, color: 'var(--navy)', display: 'block' }}>
                      {item.title}
                    </b>
                    <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                      {item.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '9px 12px',
              borderRadius: 9,
              background: 'rgba(142, 16, 24, 0.07)',
              borderLeft: '3px solid #8e1018',
              fontSize: 12,
              color: 'var(--ink)',
            }}
          >
            <b>💡 Quick Tip:</b> {step.tipText}
          </div>
        </div>

        {/* Right Column: Live Interactive Microscope / App Preview */}
        {renderLivePreviewPane()}
      </div>

      {/* Footer Navigation & Interactive "Try It Now" CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--line)',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="secondary"
            disabled={currentStepIndex === 0}
            onClick={() => onSelectStep(Math.max(0, currentStepIndex - 1))}
          >
            ← Previous Step
          </button>
          {currentStepIndex < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              className="secondary"
              onClick={() => onSelectStep(currentStepIndex + 1)}
            >
              Next Step: {TUTORIAL_STEPS[currentStepIndex + 1].shortTabTitle} (
              {currentStepIndex + 2}/{TUTORIAL_STEPS.length}) →
            </button>
          ) : (
            mode === 'modal' &&
            onCloseModal && (
              <button type="button" className="secondary" onClick={onCloseModal}>
                ✓ Finish Walkthrough
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => onTriggerAction(step.actionType, currentStepIndex)}
        >
          {step.actionLabel}
        </button>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div
        className="tutorial-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="PARASIGHT Interactive Live Preview Tutorial"
      >
        {content}
      </div>
    );
  }

  return content;
};
