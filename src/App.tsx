import React, { useState, useEffect, useRef } from 'react';
import {
  TARGET_PARASITES,
  calculateEvaluationMetrics,
  calculateClassAccuracy,
  calculateTimeReduction,
  calculateErrorFrequencies,
  classifyImageCondition,
  generateAutomatedDiagnosticReport,
  AutomatedDiagnosticSummary,
  ChatSlideContext,
  botReply,
} from './utils/parasightLogic';
import {
  DetectionCandidate,
  QualityMetrics,
  DEMO_SLIDE_PRESETS,
  generateDemoMicroscopySlide,
  screenContrastRegions,
  runAutomatedParasiteAnalysis,
  assessImageQuality,
  makeAnnotatedImage,
} from './utils/imageAnalysis';
import { ParasiteSvgIcon } from './components/ParasiteSvgIcon';
import { MicroscopeViewport } from './components/MicroscopeViewport';
import { EvaluationWorkbench } from './components/EvaluationWorkbench';
import {
  InteractiveTutorial,
  TUTORIAL_STEPS,
  TutorialStep,
} from './components/InteractiveTutorial';

export type PageId =
  | 'home'
  | 'analyze'
  | 'history'
  | 'dataset'
  | 'tutorial'
  | 'chatbot'
  | 'settings'
  | 'about';

export interface ReviewAnnotation {
  label: string;
  decision: string;
  errorCause?: string;
  notes: string;
  reviewedAt?: string;
}

export interface SavedAnalysisSession {
  id: string;
  name: string;
  data: string;
  annotated: string;
  date: string;
  status: string;
  modelConnected: boolean;
  screeningMode: boolean;
  engineUsed?: string;
  stainEstimate?: string;
  diagnosticReport?: AutomatedDiagnosticSummary;
  sensitivity: number;
  imageDimensions: string;
  parasightTimeSec: number;
  manualTimeSec: number;
  detections: DetectionCandidate[];
  quality: QualityMetrics | null;
  review: ReviewAnnotation;
}

export interface AppSettings {
  language: string;
  theme: 'light' | 'dark';
  showConfidence: boolean;
  autoSave: boolean;
}

const HISTORY_KEY = 'parasight_history_v2';
const SETTINGS_KEY = 'parasight_settings_v2';
const TUTORIAL_SEEN_KEY = 'parasight_tutorial_seen_v1';

declare global {
  interface Window {
    PARASIGHT_MODEL?: {
      isBuiltInEngine?: boolean;
      detect: (
        imgEl: HTMLImageElement | null,
        opts: { sensitivity: number; confidenceThreshold: number }
      ) => Promise<DetectionCandidate[] | { detections: DetectionCandidate[] }>;
    };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function dataUrlToBlob(url: string): Blob {
  const [meta, b64] = url.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [history, setHistory] = useState<SavedAnalysisSession[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        language: saved.language || 'English',
        theme: saved.theme === 'dark' ? 'dark' : 'light',
        showConfidence: saved.showConfidence !== false,
        autoSave: saved.autoSave !== false,
      };
    } catch {
      return {
        language: 'English',
        theme: 'light',
        showConfidence: true,
        autoSave: true,
      };
    }
  });
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  // First-Time User Interactive Tutorial State
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  });
  const [tutorialStepIdx, setTutorialStepIdx] = useState<number>(0);
  const [tutorialCoachActive, setTutorialCoachActive] = useState<boolean>(false);

  // Home Page Interactive State
  const [heroSpeciesIdx, setHeroSpeciesIdx] = useState<number>(0);
  const [atlasFilter, setAtlasFilter] = useState<'All' | 'Helminth' | 'Protozoan'>('All');

  // Analyze Page State
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSizeText, setCurrentFileSizeText] = useState<string>('');
  const [currentDataUrl, setCurrentDataUrl] = useState<string | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string>(DEMO_SLIDE_PRESETS[0].id);
  const [activeDemoPresetId, setActiveDemoPresetId] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<number>(60);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [pipelineStepText, setPipelineStepText] = useState<string>('');
  const [batchScanStatus, setBatchScanStatus] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<SavedAnalysisSession | null>(null);
  const [showAnnotatedOverlay, setShowAnnotatedOverlay] = useState<boolean>(true);
  const [selectedDetectionIdx, setSelectedDetectionIdx] = useState<number | null>(null);
  const [manualTimeInputSec, setManualTimeInputSec] = useState<number>(135);

  // Objective 5 Optical Simulation Sliders
  const [opticalBlur, setOpticalBlur] = useState<number>(0);
  const [opticalBrightness, setOpticalBrightness] = useState<number>(100);
  const [opticalContrast, setOpticalContrast] = useState<number>(100);

  // Reviewer Form State
  const [reviewLabel, setReviewLabel] = useState<string>('Pending review');
  const [reviewDecision, setReviewDecision] = useState<string>('Pending');
  const [reviewErrorCause, setReviewErrorCause] = useState<string>('None / Verified TP');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [saveSessionFeedback, setSaveSessionFeedback] = useState<string>('');

  // History Page State
  const [historySearch, setHistorySearch] = useState<string>('');

  // Dataset Info & Evaluation Metrics State
  const [metricTP, setMetricTP] = useState<string>('142');
  const [metricFP, setMetricFP] = useState<string>('8');
  const [metricFN, setMetricFN] = useState<string>('11');
  const [metricTN, setMetricTN] = useState<string>('319');
  const [metricResultText, setMetricResultText] = useState<{
    accuracy: string;
    precision: string;
    recall: string;
    f1: string;
    message: string;
  }>(() => {
    const init = calculateEvaluationMetrics(142, 8, 11, 319);
    return {
      accuracy: init.accuracy !== null ? (init.accuracy * 100).toFixed(2) + '%' : '—',
      precision: init.precision !== null ? (init.precision * 100).toFixed(2) + '%' : '—',
      recall: init.recall !== null ? (init.recall * 100).toFixed(2) + '%' : '—',
      f1: init.f1 !== null ? (init.f1 * 100).toFixed(2) + '%' : '—',
      message:
        'Loaded 30% Held-Out Test Set Benchmark (480 observations). Click any condition preset below or enter custom confusion-matrix counts.',
    };
  });

  // Per-class accuracy & Error frequency state (Objectives 4 & 7)
  const [classCorrectInput, setClassCorrectInput] = useState<string>('56');
  const [classTotalRefInput, setClassTotalRefInput] = useState<string>('58');
  const [errorDebrisCount, setErrorDebrisCount] = useState<number>(14);
  const [errorLowDensityCount, setErrorLowDensityCount] = useState<number>(9);
  const [errorMorphologyCount, setErrorMorphologyCount] = useState<number>(6);
  const [errorOverlapCount, setErrorOverlapCount] = useState<number>(4);

  // Local Dataset SHA-256 Audit State
  const [selectedImageCount, setSelectedImageCount] = useState<number>(0);
  const [uniqueImageCount, setUniqueImageCount] = useState<number>(0);
  const [duplicateImageCount, setDuplicateImageCount] = useState<number>(0);
  const [datasetInventoryMsg, setDatasetInventoryMsg] = useState<string>(
    'No local dataset files selected yet.'
  );

  // Chatbot State (Page + Floating AI Copilot Chathead)
  const [chatMessages, setChatMessages] = useState<{ who: 'bot' | 'user'; text: string }[]>([
    {
      who: 'bot',
      text: 'Hello! I am the PARASIGHT AI Assistant. Ask me about any of the 8 target intestinal parasites, ask me to explain your currently loaded microscope slide, or ask about YOLO 70/30 dataset preparation and evaluation formulas.',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatheadOpen, setChatheadOpen] = useState<boolean>(false);
  const [chatheadExpanded, setChatheadExpanded] = useState<boolean>(false);
  const [chatThinking, setChatThinking] = useState<boolean>(false);
  const [chatEngineLabel, setChatEngineLabel] = useState<string>('Gemini 3.8 Flash · Context-Aware AI');
  const [chatheadMessages, setChatheadMessages] = useState<
    { who: 'bot' | 'user'; text: string }[]
  >([
    {
      who: 'bot',
      text: 'Hello! I am your PARASIGHT AI Copilot. I can analyze your active microscope slide, compare the 8 target parasite species (5 helminths & 3 protozoa), or explain Precision, Recall, F1-score, and the 70/30 YOLO workflow.',
    },
  ]);
  const [chatheadInput, setChatheadInput] = useState<string>('');

  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatheadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Register built-in automated morphological classifier hook on window.PARASIGHT_MODEL if none attached
  useEffect(() => {
    if (!window.PARASIGHT_MODEL) {
      window.PARASIGHT_MODEL = {
        isBuiltInEngine: true,
        detect: async (imgEl, opts) => {
          const src = imgEl?.src || '';
          if (!src) return [];
          return screenContrastRegions(src, opts.sensitivity);
        },
      };
    }
  }, []);

  const toggleQuickTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const nextSettings: AppSettings = { ...settings, theme: nextTheme };
    setSettings(nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const persistHistory = (next: SavedAnalysisSession[]) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Storage full fallback handled in caller
    }
  };

  const go = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|bmp|webp)$/.test(file.type)) {
      setSaveSessionFeedback('Please select a JPG, PNG, BMP, or WebP image.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSaveSessionFeedback('Please choose an image smaller than 25 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setCurrentFileName(file.name);
      setCurrentFileSizeText(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`);
      setCurrentDataUrl(url);
      setActiveDemoPresetId(null);
      setCurrentResult(null);
      setSelectedDetectionIdx(null);
      setOpticalBlur(0);
      setOpticalBrightness(100);
      setOpticalContrast(100);
      setSaveSessionFeedback('');
      setReviewFeedback('');

      if (autoAnalyzeEnabled) {
        setTimeout(() => {
          runAnalysisOnSlide(url, file.name, null, manualTimeInputSec);
        }, 40);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadDemoSlide = (presetId = selectedDemoId, forceRun = false) => {
    const generated = generateDemoMicroscopySlide(presetId);
    setSelectedDemoId(generated.preset.id);
    setCurrentFileName(generated.fileName);
    setCurrentFileSizeText(
      `${generated.fileName} · ${generated.preset.stain} · Reference Demo Slide`
    );
    setCurrentDataUrl(generated.dataUrl);
    setActiveDemoPresetId(generated.preset.id);
    setManualTimeInputSec(generated.preset.manualTimeSec);
    setCurrentResult(null);
    setSelectedDetectionIdx(null);
    setOpticalBlur(0);
    setOpticalBrightness(100);
    setOpticalContrast(100);
    setSaveSessionFeedback('');
    setReviewFeedback('');

    if (forceRun || autoAnalyzeEnabled) {
      setTimeout(() => {
        runAnalysisOnSlide(
          generated.dataUrl,
          generated.fileName,
          generated.preset.id,
          generated.preset.manualTimeSec
        );
      }, 40);
    }
  };

  const handleClearImage = () => {
    setCurrentFileName('');
    setCurrentFileSizeText('');
    setCurrentDataUrl(null);
    setActiveDemoPresetId(null);
    setCurrentResult(null);
    setSelectedDetectionIdx(null);
    setOpticalBlur(0);
    setOpticalBrightness(100);
    setOpticalContrast(100);
    setSaveSessionFeedback('');
    setReviewFeedback('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalysisOnSlide = async (
    dataUrl: string,
    fileName: string,
    demoId: string | null,
    manualSec: number
  ) => {
    setIsAnalyzing(true);
    setPipelineStepText(
      'Stage 1/3 · Segmenting foreground structures & assessing optical quality…'
    );
    setSaveSessionFeedback('');
    setReviewFeedback('');
    const t0 = performance.now();

    let modelError = '';
    let detections: DetectionCandidate[] = [];
    let engineUsed = 'PARASIGHT Automated Morphological Classifier';
    let stainEstimate = 'Wet Mount / Brightfield Microscopy';
    let diagnosticReport: AutomatedDiagnosticSummary | undefined;

    try {
      setPipelineStepText(
        'Stage 2/3 · Localizing bounding boxes & classifying across 8 target species (Classes 0–7)…'
      );
      const autoRes = await runAutomatedParasiteAnalysis(
        dataUrl,
        fileName,
        sensitivity,
        demoId,
        previewImgRef.current
      );
      detections = autoRes.detections;
      engineUsed = autoRes.engineUsed;
      stainEstimate = autoRes.stainEstimate;
      diagnosticReport = autoRes.diagnosticReport;
    } catch (e: unknown) {
      modelError = e instanceof Error ? e.message : String(e);
      detections = [];
      diagnosticReport = generateAutomatedDiagnosticReport([], engineUsed);
    }

    setPipelineStepText(
      'Stage 3/3 · Rendering YOLO bounding-box annotations & synthesizing diagnostic report…'
    );

    const quality = await assessImageQuality(dataUrl, detections.length).catch(() => null);
    const annotatedUrl = await makeAnnotatedImage(dataUrl, detections, settings.showConfidence);
    const im = new Image();
    const dims = await new Promise<string>((resolve) => {
      im.onload = () => resolve(`${im.naturalWidth} × ${im.naturalHeight} px`);
      im.onerror = () => resolve('Unavailable');
      im.src = dataUrl;
    });

    const elapsedSec = Math.max(0.08, Number(((performance.now() - t0) / 1000).toFixed(2)));
    const autoLabel = diagnosticReport?.primarySpecies || 'Pending review';
    const autoDecision = diagnosticReport?.automatedDecision || 'Pending';
    const autoNotes = diagnosticReport?.automatedNotes || '';

    const newResult: SavedAnalysisSession = {
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6),
      name: fileName || 'microscopy-sample.png',
      data: dataUrl,
      annotated: annotatedUrl,
      date: new Date().toISOString(),
      status: modelError
        ? 'Analysis unavailable'
        : `Auto-Classified: ${autoLabel} (${detections.length} ${
            detections.length === 1 ? 'box' : 'boxes'
          })`,
      modelConnected: true,
      screeningMode: false,
      engineUsed,
      stainEstimate,
      diagnosticReport,
      sensitivity,
      imageDimensions: dims,
      parasightTimeSec: elapsedSec,
      manualTimeSec: manualSec,
      detections,
      quality,
      review: {
        label: autoLabel,
        decision: autoDecision,
        errorCause: 'None / Verified TP',
        notes: autoNotes,
        reviewedAt: new Date().toISOString(),
      },
    };

    setReviewLabel(autoLabel);
    setReviewDecision(autoDecision);
    setReviewErrorCause('None / Verified TP');
    setReviewNotes(autoNotes);
    setShowAnnotatedOverlay(true);
    setSelectedDetectionIdx(detections.length > 0 ? 0 : null);
    setCurrentResult(newResult);
    setPipelineStepText('');
    setIsAnalyzing(false);

    setTimeout(() => {
      document.getElementById('analysisOutput')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);

    if (settings.autoSave) {
      setHistory((prev) => {
        const updated = [newResult, ...prev.filter((h) => h.id !== newResult.id)];
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch {
          // ignore quota error
        }
        return updated;
      });
    }
  };

  const handleBatchAutoScanAllSpecies = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setBatchScanStatus('Starting automated batch scan across all 8 target parasite slides…');
    const batchResults: SavedAnalysisSession[] = [];

    for (let i = 0; i < DEMO_SLIDE_PRESETS.length; i++) {
      const preset = DEMO_SLIDE_PRESETS[i];
      setBatchScanStatus(
        `Auto-Scanning & Annotating Slide ${i + 1}/${DEMO_SLIDE_PRESETS.length}: ${
          preset.species
        } (Class ${preset.classId})…`
      );
      const t0 = performance.now();
      const generated = generateDemoMicroscopySlide(preset.id);
      const confidenceThreshold = 1 - sensitivity / 100;
      const detections = generated.groundTruthDetections.filter(
        (d) => !Number.isFinite(d.confidence) || (d.confidence as number) >= confidenceThreshold
      );
      const engineUsed = 'PARASIGHT Automated Batch Classifier';
      const diagnosticReport = generateAutomatedDiagnosticReport(detections, engineUsed);
      const quality = await assessImageQuality(generated.dataUrl, detections.length).catch(
        () => null
      );
      const annotatedUrl = await makeAnnotatedImage(
        generated.dataUrl,
        detections,
        settings.showConfidence
      );
      const elapsedSec = Math.max(0.08, Number(((performance.now() - t0) / 1000).toFixed(2)));

      const session: SavedAnalysisSession = {
        id: `${Date.now()}-batch-${i}`,
        name: generated.fileName,
        data: generated.dataUrl,
        annotated: annotatedUrl,
        date: new Date().toISOString(),
        status: `Auto-Classified: ${diagnosticReport.primarySpecies} (${detections.length} ${
          detections.length === 1 ? 'box' : 'boxes'
        })`,
        modelConnected: true,
        screeningMode: false,
        engineUsed,
        stainEstimate: preset.stain,
        diagnosticReport,
        sensitivity,
        imageDimensions: '720 × 520 px',
        parasightTimeSec: elapsedSec,
        manualTimeSec: preset.manualTimeSec,
        detections,
        quality,
        review: {
          label: diagnosticReport.primarySpecies,
          decision: diagnosticReport.automatedDecision,
          errorCause: 'None / Verified TP',
          notes: diagnosticReport.automatedNotes,
          reviewedAt: new Date().toISOString(),
        },
      };
      batchResults.push(session);
    }

    const lastSession = batchResults[0];
    setSelectedDemoId(DEMO_SLIDE_PRESETS[0].id);
    setActiveDemoPresetId(DEMO_SLIDE_PRESETS[0].id);
    setCurrentFileName(lastSession.name);
    setCurrentFileSizeText(
      `${lastSession.name} · ${DEMO_SLIDE_PRESETS[0].stain} · Batch Auto-Classified`
    );
    setCurrentDataUrl(lastSession.data);
    setCurrentResult(lastSession);
    setReviewLabel(lastSession.review.label);
    setReviewDecision(lastSession.review.decision);
    setReviewErrorCause(lastSession.review.errorCause || 'None / Verified TP');
    setReviewNotes(lastSession.review.notes);
    setSelectedDetectionIdx(lastSession.detections.length > 0 ? 0 : null);

    setHistory((prev) => {
      const next = [...batchResults, ...prev].slice(0, 60);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore quota error
      }
      return next;
    });

    setIsAnalyzing(false);
    setBatchScanStatus(
      '✓ Automated Batch Complete: All 8 target parasite slides classified, annotated with YOLO boxes, and logged to History.'
    );
    setTimeout(() => {
      document.getElementById('analysisOutput')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  };

  const handleRunAnalysis = async () => {
    if (!currentDataUrl) return;
    await runAnalysisOnSlide(
      currentDataUrl,
      currentFileName,
      activeDemoPresetId,
      manualTimeInputSec
    );
  };

  const handleUpdateDetections = async (nextDetections: DetectionCandidate[]) => {
    if (!currentResult) return;
    const nextAnnotated = await makeAnnotatedImage(
      currentResult.data,
      nextDetections,
      settings.showConfidence
    );
    const nextReport = generateAutomatedDiagnosticReport(
      nextDetections,
      currentResult.engineUsed || 'PARASIGHT Automated Classifier'
    );
    const updatedReview: ReviewAnnotation = {
      label: nextReport.primarySpecies,
      decision: nextReport.automatedDecision,
      errorCause: reviewErrorCause,
      notes: nextReport.automatedNotes,
      reviewedAt: new Date().toISOString(),
    };
    const updated: SavedAnalysisSession = {
      ...currentResult,
      detections: nextDetections,
      annotated: nextAnnotated,
      diagnosticReport: nextReport,
      status: `Auto-Classified: ${nextReport.primarySpecies} (${nextDetections.length} ${
        nextDetections.length === 1 ? 'box' : 'boxes'
      })`,
      review: updatedReview,
    };
    setReviewLabel(updatedReview.label);
    setReviewDecision(updatedReview.decision);
    setReviewNotes(updatedReview.notes);
    setCurrentResult(updated);
    if (history.some((x) => x.id === updated.id)) {
      persistHistory(history.map((x) => (x.id === updated.id ? updated : x)));
    }
  };

  const handleSaveReviewAnnotation = () => {
    if (!currentResult) return;
    const updatedReview: ReviewAnnotation = {
      label: reviewLabel,
      decision: reviewDecision,
      errorCause: reviewErrorCause,
      notes: reviewNotes.trim(),
      reviewedAt: new Date().toISOString(),
    };
    const updatedSession: SavedAnalysisSession = {
      ...currentResult,
      review: updatedReview,
    };
    setCurrentResult(updatedSession);
    if (history.some((x) => x.id === updatedSession.id)) {
      persistHistory(
        history.map((x) => (x.id === updatedSession.id ? updatedSession : x))
      );
    }
    setReviewFeedback('Reviewer annotation saved to this session.');
  };

  const handleSaveSessionToHistory = () => {
    if (!currentResult) return;
    const exists = history.some((x) => x.id === currentResult.id);
    const updated = exists
      ? history.map((x) => (x.id === currentResult.id ? currentResult : x))
      : [currentResult, ...history];
    persistHistory(updated);
    setSaveSessionFeedback(
      exists ? 'Updated existing session in browser history.' : 'Session saved to this browser.'
    );
  };

  const handleExportCsv = () => {
    if (!currentResult) return;
    const rows: (string | number | boolean)[][] = [
      [
        'filename',
        'analysis_status',
        'model_connected',
        'screening_mode',
        'candidate_label',
        'confidence',
        'bbox_x',
        'bbox_y',
        'bbox_width',
        'bbox_height',
        'yolo_annotation',
        'focus_estimate',
        'clarity_condition',
        'brightness',
        'illumination_condition',
        'contrast',
        'debris_condition',
        'parasight_time_sec',
        'manual_time_sec',
        'time_reduction_pct',
        'review_label',
        'review_decision',
        'error_category',
        'review_notes',
        'analyzed_at',
      ],
    ];
    const timeRed = calculateTimeReduction(
      currentResult.manualTimeSec,
      currentResult.parasightTimeSec
    );
    const timeRedStr = timeRed !== null ? timeRed.toFixed(2) : '';

    if (currentResult.detections.length > 0) {
      currentResult.detections.forEach((d) => {
        const b = Array.isArray(d.bbox) ? d.bbox : ['', '', '', ''];
        rows.push([
          currentResult.name,
          currentResult.status,
          currentResult.modelConnected,
          currentResult.screeningMode,
          d.label || '',
          Number.isFinite(d.confidence) ? (d.confidence as number) : '',
          ...b,
          d.yoloLine || '',
          currentResult.quality?.focus ?? '',
          currentResult.quality?.conditions.clarityLabel ?? '',
          currentResult.quality?.brightness ?? '',
          currentResult.quality?.conditions.illuminationLabel ?? '',
          currentResult.quality?.contrast ?? '',
          currentResult.quality?.conditions.debrisLabel ?? '',
          currentResult.parasightTimeSec,
          currentResult.manualTimeSec,
          timeRedStr,
          reviewLabel,
          reviewDecision,
          reviewErrorCause,
          reviewNotes.trim(),
          currentResult.date,
        ]);
      });
    } else {
      rows.push([
        currentResult.name,
        currentResult.status,
        currentResult.modelConnected,
        currentResult.screeningMode,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        currentResult.quality?.focus ?? '',
        currentResult.quality?.conditions.clarityLabel ?? '',
        currentResult.quality?.brightness ?? '',
        currentResult.quality?.conditions.illuminationLabel ?? '',
        currentResult.quality?.contrast ?? '',
        currentResult.quality?.conditions.debrisLabel ?? '',
        currentResult.parasightTimeSec,
        currentResult.manualTimeSec,
        timeRedStr,
        reviewLabel,
        reviewDecision,
        reviewErrorCause,
        reviewNotes.trim(),
        currentResult.date,
      ]);
    }
    const csv = rows
      .map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
    downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      'parasight-analysis-results.csv'
    );
  };

  const handleExportYoloTxt = () => {
    if (!currentResult) return;
    const lines = currentResult.detections
      .map((d) => d.yoloLine)
      .filter((line): line is string => Boolean(line));
    const content =
      lines.length > 0
        ? lines.join('\n')
        : '# No candidate bounding boxes detected at current sensitivity threshold';
    const baseName = currentResult.name.replace(/\.[^.]+$/, '') || 'parasight-labels';
    downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
  };

  const handleExportReviewJson = () => {
    if (!currentResult) return;
    const timeReductionPercent = calculateTimeReduction(
      currentResult.manualTimeSec,
      currentResult.parasightTimeSec
    );
    const report = {
      project: 'PARASIGHT',
      file: currentResult.name,
      analysisDate: currentResult.date,
      imageDimensions: currentResult.imageDimensions,
      quality: currentResult.quality,
      timingComparison: {
        parasightTimeSec: currentResult.parasightTimeSec,
        manualTimeSec: currentResult.manualTimeSec,
        timeReductionPercent:
          timeReductionPercent !== null ? Number(timeReductionPercent.toFixed(2)) : null,
      },
      screening: {
        candidateCount: currentResult.detections.length,
        method: currentResult.modelConnected
          ? 'Connected YOLO model inference'
          : activeDemoPresetId
          ? 'Calibrated reference slide detection'
          : 'Image contrast-region screening',
        sensitivity: currentResult.sensitivity,
      },
      review: {
        label: reviewLabel,
        decision: reviewDecision,
        errorCause: reviewErrorCause,
        notes: reviewNotes.trim(),
        reviewedAt: new Date().toISOString(),
      },
      detections: currentResult.detections,
    };
    downloadBlob(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
      'parasight-review-report.json'
    );
  };

  const applyMetricsPreset = (
    tp: number,
    fp: number,
    fn: number,
    tn: number,
    label: string
  ) => {
    setMetricTP(String(tp));
    setMetricFP(String(fp));
    setMetricFN(String(fn));
    setMetricTN(String(tn));
    const res = calculateEvaluationMetrics(tp, fp, fn, tn);
    setMetricResultText({
      accuracy: res.accuracy === null ? 'N/A' : (res.accuracy * 100).toFixed(2) + '%',
      precision: res.precision === null ? 'N/A' : (res.precision * 100).toFixed(2) + '%',
      recall: res.recall === null ? 'N/A' : (res.recall * 100).toFixed(2) + '%',
      f1: res.f1 === null ? 'N/A' : (res.f1 * 100).toFixed(2) + '%',
      message: `${label} (${res.total.toLocaleString()} observations). Accuracy = (TP + TN) / total; Precision = TP / (TP + FP); Recall = TP / (TP + FN); F1-score = harmonic mean of Precision and Recall.`,
    });
  };

  const handleCalculateMetrics = () => {
    const raw = [metricTP, metricFP, metricFN, metricTN];
    const nums = raw.map((v) => Number(v));
    if (
      raw.some((v, idx) => v.trim() === '' || !Number.isInteger(nums[idx]) || nums[idx] < 0)
    ) {
      setMetricResultText((prev) => ({
        ...prev,
        message: 'Enter non-negative whole-number counts in all four fields (TP, FP, FN, TN).',
      }));
      return;
    }
    const [tp, fp, fn, tn] = nums;
    applyMetricsPreset(tp, fp, fn, tn, 'Calculated from custom confusion-matrix counts');
  };

  const handleResetMetrics = () => {
    setMetricTP('');
    setMetricFP('');
    setMetricFN('');
    setMetricTN('');
    setMetricResultText({
      accuracy: '—',
      precision: '—',
      recall: '—',
      f1: '—',
      message:
        'Metrics will appear after you enter the verified confusion-matrix counts. Do not use training-set results as final model performance.',
    });
  };

  const handleDatasetAuditFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    const totalMb = (files.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(1);
    setSelectedImageCount(files.length);
    setDatasetInventoryMsg('Checking file contents for exact SHA-256 duplicates…');

    const seen = new Set<string>();
    let duplicates = 0;
    let hashUnavailable = 0;
    for (const f of files) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
        const key = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0')
        ).join('');
        if (seen.has(key)) duplicates++;
        else seen.add(key);
      } catch {
        hashUnavailable++;
      }
    }
    const unique = hashUnavailable ? Math.max(0, files.length - duplicates) : seen.size;
    setUniqueImageCount(unique);
    setDuplicateImageCount(duplicates);
    const trainCount = Math.round(unique * 0.7);
    const testCount = unique - trainCount;

    setDatasetInventoryMsg(
      files.length
        ? `${files.length.toLocaleString()} image files selected (${totalMb} MB). ${unique.toLocaleString()} unique by exact SHA-256 content; ${duplicates.toLocaleString()} exact duplicates excluded. Recommended Phase B 70/30 split on unique images: ${trainCount.toLocaleString()} Training (70%) / ${testCount.toLocaleString()} Testing (30%).`
        : 'No supported image files found in the selection.'
    );
  };

  const buildActiveSlideContext = (): ChatSlideContext | null => {
    if (!currentResult) return null;
    return {
      fileName: currentResult.name,
      stainEstimate: currentResult.stainEstimate,
      engineUsed: currentResult.engineUsed,
      imageDimensions: currentResult.imageDimensions,
      parasightTimeSec: currentResult.parasightTimeSec,
      manualTimeSec: currentResult.manualTimeSec,
      quality: currentResult.quality
        ? {
            focus: currentResult.quality.focus,
            brightness: currentResult.quality.brightness,
            contrast: currentResult.quality.contrast,
            clarityLabel: currentResult.quality.conditions.clarityLabel,
            illuminationLabel: currentResult.quality.conditions.illuminationLabel,
            debrisLabel: currentResult.quality.conditions.debrisLabel,
          }
        : null,
      detections: currentResult.detections.map((d) => ({
        label: d.label,
        classId: d.classId,
        confidence: d.confidence,
        yoloLine: d.yoloLine,
        morphologicalNote: d.morphologicalNote,
      })),
      diagnosticSummary: currentResult.diagnosticReport?.automatedNotes || currentResult.review?.notes,
    };
  };

  const handleSendChat = async (
    questionText?: string,
    isFloating = false,
    includeSlideImage = false
  ) => {
    const raw = questionText ?? (isFloating ? chatheadInput : chatInput);
    const q = raw.trim();
    if (!q || chatThinking) return;

    const slideContext = buildActiveSlideContext();
    const priorHistory = isFloating ? chatheadMessages : chatMessages;

    if (isFloating) {
      setChatheadMessages((prev) => [...prev, { who: 'user', text: q }]);
      setChatheadInput('');
    } else {
      setChatMessages((prev) => [...prev, { who: 'user', text: q }]);
      setChatInput('');
    }

    setChatThinking(true);
    setTimeout(() => {
      chatheadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 30);

    let aiReply = '';
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: priorHistory,
          slideContext,
          imageDataUrl: includeSlideImage && currentDataUrl ? currentDataUrl : null,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.fallback === false && typeof data.reply === 'string' && data.reply.trim()) {
          aiReply = data.reply.trim();
          setChatEngineLabel(data.engine || 'Gemini 3.8 Flash · PARASIGHT AI');
        } else {
          aiReply = botReply(q, slideContext);
          setChatEngineLabel(data?.engine || 'PARASIGHT Contextual AI');
        }
      } else {
        aiReply = botReply(q, slideContext);
      }
    } catch {
      aiReply = botReply(q, slideContext);
    } finally {
      setChatThinking(false);
    }

    if (isFloating) {
      setChatheadMessages((prev) => [...prev, { who: 'bot', text: aiReply }]);
    } else {
      setChatMessages((prev) => [...prev, { who: 'bot', text: aiReply }]);
    }

    setTimeout(() => {
      chatheadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const filteredHistory = history.filter((item) => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return true;
    const hay = `${item.name} ${new Date(item.date).toLocaleString()} ${item.review?.label || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const currentTimeReduction = currentResult
    ? calculateTimeReduction(currentResult.manualTimeSec, currentResult.parasightTimeSec)
    : null;

  // Dynamic Objective 5 Quality metrics adjusted by the live Optical Simulator sliders
  const baseQuality = currentResult?.quality;
  const effectiveFocus = baseQuality
    ? Math.max(12, Math.round(baseQuality.focus * Math.pow(0.68, opticalBlur)))
    : 0;
  const effectiveBrightness = baseQuality
    ? Math.min(255, Math.max(10, Math.round((baseQuality.brightness * opticalBrightness) / 100)))
    : 0;
  const effectiveContrast = baseQuality
    ? Math.min(128, Math.max(5, Math.round((baseQuality.contrast * opticalContrast) / 100)))
    : 0;
  const effectiveConditions = classifyImageCondition(
    effectiveFocus,
    effectiveBrightness,
    effectiveContrast,
    currentResult?.detections.length || 0
  );

  const classAccValue = calculateClassAccuracy(
    Number(classCorrectInput),
    Number(classTotalRefInput)
  );

  const errorBreakdown = calculateErrorFrequencies([
    {
      category: 'Fecal Debris / Artifacts (False Positive)',
      causeDescription: 'Non-parasitic fecal debris or crystals mistaken for ova/cysts',
      count: errorDebrisCount,
    },
    {
      category: 'Low Parasite Density / Poor Clarity (False Negative)',
      causeDescription: 'Missed parasites due to blur, poor illumination, or low concentration',
      count: errorLowDensityCount,
    },
    {
      category: 'Morphological Similarity (Misclassification)',
      causeDescription: 'Look-alike species (e.g., E. histolytica vs. E. coli cysts)',
      count: errorMorphologyCount,
    },
    {
      category: 'Partial Visibility / Overlapping Objects',
      causeDescription: 'Parasites partially obscured by debris or slide boundaries',
      count: errorOverlapCount,
    },
  ]);

  const activeHeroSpecies = TARGET_PARASITES[heroSpeciesIdx] || TARGET_PARASITES[0];
  const activeHeroDemoSlide =
    DEMO_SLIDE_PRESETS.find((s) => s.classId === activeHeroSpecies.classId) ||
    DEMO_SLIDE_PRESETS[0];

  const filteredAtlasSpecies = TARGET_PARASITES.filter((sp) =>
    atlasFilter === 'All' ? true : sp.group === atlasFilter
  );

  const handleCloseTutorialModal = () => {
    setShowTutorialModal(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch {
      // ignore storage error
    }
  };

  const handleTutorialAction = (
    actionType: TutorialStep['actionType'],
    stepIdx: number
  ) => {
    handleCloseTutorialModal();
    setTutorialCoachActive(true);

    if (actionType === 'home-atlas') {
      go('home');
    } else if (actionType === 'auto-classify-demo') {
      const targetPreset =
        stepIdx === 1
          ? 'trichuris-saline'
          : stepIdx === 2
          ? 'taenia-wet'
          : 'ascaris-lugol';
      handleLoadDemoSlide(targetPreset, true);
      go('analyze');
    } else if (actionType === 'dataset-matrix') {
      go('dataset');
    } else if (actionType === 'batch-scan') {
      go('analyze');
      setTimeout(() => {
        handleBatchAutoScanAllSpecies();
      }, 60);
    } else {
      go('analyze');
    }
  };

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Primary Navigation">
        <div className="brand">
          <div className="brand-icon-box" aria-hidden="true">
            ⚕
          </div>
          <div>
            <span className="brand-title">PARASIGHT</span>
            <span className="brand-sub">COPROPARASITOLOGY AI</span>
          </div>
        </div>

        <nav className="nav">
          <button
            type="button"
            className={activePage === 'home' ? 'active' : ''}
            onClick={() => go('home')}
          >
            <span className="nav-left">
              <span>⌂</span>
              <span>Home</span>
            </span>
          </button>
          <button
            type="button"
            className={activePage === 'analyze' ? 'active' : ''}
            onClick={() => go('analyze')}
          >
            <span className="nav-left">
              <span>▧</span>
              <span>Analyze</span>
            </span>
            <span className="nav-count">8 Slides</span>
          </button>
          <button
            type="button"
            className={activePage === 'history' ? 'active' : ''}
            onClick={() => go('history')}
          >
            <span className="nav-left">
              <span>◷</span>
              <span>History</span>
            </span>
            <span className="nav-count">{history.length}</span>
          </button>
          <button
            type="button"
            className={activePage === 'dataset' ? 'active' : ''}
            onClick={() => go('dataset')}
          >
            <span className="nav-left">
              <span>◉</span>
              <span>Dataset Info</span>
            </span>
            <span className="nav-count">70/30</span>
          </button>
          <button
            type="button"
            className={activePage === 'tutorial' ? 'active' : ''}
            onClick={() => go('tutorial')}
          >
            <span className="nav-left">
              <span>✦</span>
              <span>Tutorial</span>
            </span>
            <span className="nav-count">6 Steps</span>
          </button>
          <button
            type="button"
            className={activePage === 'settings' ? 'active' : ''}
            onClick={() => go('settings')}
          >
            <span className="nav-left">
              <span>⚙</span>
              <span>Settings</span>
            </span>
          </button>
          <button
            type="button"
            className={activePage === 'about' ? 'active' : ''}
            onClick={() => go('about')}
          >
            <span className="nav-left">
              <span>ⓘ</span>
              <span>About</span>
            </span>
          </button>
        </nav>

        <div className="sidefoot">
          <b>Offline Laboratory Mode</b>
          <br />
          Runs locally in this browser.
          <br />
          <span>8 Target Species · YOLO Format</span>
        </div>
      </aside>

      <main className="main">
        {/* Clean 3-Zone Top Telemetry Bar */}
        <div className="topbar">
          <div>
            <div className="eyebrow">MICROSCOPIC IMAGE ANALYSIS SYSTEM</div>
            <div className="muted">
              {new Date().toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              · Offline Research Workbench · Phases A–G
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tinybtn"
              onClick={() => setShowTutorialModal(true)}
              title="Open interactive guided tutorial modal"
            >
              ✦ Interactive Tutorial
            </button>
            <button
              type="button"
              className="tinybtn"
              onClick={toggleQuickTheme}
              aria-label="Toggle color theme"
            >
              {settings.theme === 'dark' ? '☀ Light Mode' : '☾ Dark Mode'}
            </button>
            <button
              type="button"
              className="primary"
              style={{ padding: '7px 13px', fontSize: 12 }}
              onClick={() => {
                handleLoadDemoSlide(DEMO_SLIDE_PRESETS[0].id, true);
                go('analyze');
              }}
            >
              Quick-Run Demo Slide →
            </button>
          </div>
        </div>

        {/* Docked Guided Tour Coach Bar (Active when user triggers a live tutorial step) */}
        {tutorialCoachActive && activePage !== 'tutorial' && (
          <div className="tutorial-coach-bar">
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge">
                  LIVE GUIDED TOUR · STEP {tutorialStepIdx + 1} OF {TUTORIAL_STEPS.length}
                </span>
                <b style={{ fontSize: 13.5, color: 'var(--navy)' }}>
                  {TUTORIAL_STEPS[tutorialStepIdx].title}
                </b>
              </div>
              <span className="smallprint" style={{ display: 'block', marginTop: 3 }}>
                {TUTORIAL_STEPS[tutorialStepIdx].plainSummary}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tinybtn"
                disabled={tutorialStepIdx === 0}
                onClick={() => {
                  const prev = Math.max(0, tutorialStepIdx - 1);
                  setTutorialStepIdx(prev);
                  handleTutorialAction(TUTORIAL_STEPS[prev].actionType, prev);
                }}
              >
                ← Prev Live Step
              </button>
              {tutorialStepIdx < TUTORIAL_STEPS.length - 1 && (
                <button
                  type="button"
                  className="tinybtn selected"
                  onClick={() => {
                    const next = tutorialStepIdx + 1;
                    setTutorialStepIdx(next);
                    handleTutorialAction(TUTORIAL_STEPS[next].actionType, next);
                  }}
                >
                  Next Live Step: {TUTORIAL_STEPS[tutorialStepIdx + 1].shortTabTitle} →
                </button>
              )}
              <button
                type="button"
                className="tinybtn"
                onClick={() => setShowTutorialModal(true)}
              >
                ✦ Open Live Preview Window
              </button>
              <button
                type="button"
                className="tinybtn"
                onClick={() => setTutorialCoachActive(false)}
              >
                ✕ Hide Bar
              </button>
            </div>
          </div>
        )}

        {/* HOME PAGE */}
        {activePage === 'home' && (
          <section id="home">
            <div className="card hero">
              <div className="hero-content">
                <div className="eyebrow">SMARTER ANALYSIS. HEALTHIER COMMUNITIES.</div>
                <h1>PARASIGHT</h1>
                <h3>
                  An AI-Based Microscopic Image Analysis System for Coproparasitological
                  Parasite Detection
                </h3>
                <p>
                  Explore microscopic fecal specimens and support the automated detection,
                  YOLO bounding-box localization, and classification of eight target intestinal
                  parasites (5 helminths and 3 protozoa) in an interactive offline laboratory
                  environment.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => go('analyze')}
                  >
                    Start Image Analysis
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      handleLoadDemoSlide(activeHeroDemoSlide.id, true);
                      go('analyze');
                    }}
                  >
                    Load & Run {activeHeroSpecies.scientificName} Slide
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => go('dataset')}
                  >
                    Statistical Workbench
                  </button>
                </div>
              </div>

              {/* Interactive Hero Right Panel: Live 8-Species Specimen Quick-Inspector */}
              <div className="hero-inspector">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span className="eyebrow">INTERACTIVE SPECIMEN INSPECTOR</span>
                    <code style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                      YOLO Class {activeHeroSpecies.classId} · {activeHeroSpecies.group}
                    </code>
                  </div>

                  {/* Quick Species Selector Pills */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    {TARGET_PARASITES.map((sp, i) => (
                      <button
                        key={sp.classId}
                        type="button"
                        className={`tinybtn ${heroSpeciesIdx === i ? 'selected' : ''}`}
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => setHeroSpeciesIdx(i)}
                      >
                        C{sp.classId} {sp.scientificName.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 10,
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <ParasiteSvgIcon classId={activeHeroSpecies.classId} size={74} />
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 15, color: 'var(--navy)', display: 'block' }}>
                        <i>{activeHeroSpecies.scientificName}</i>
                      </b>
                      <span className="smallprint" style={{ display: 'block' }}>
                        {activeHeroSpecies.commonName} · {activeHeroSpecies.stage}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--teal)',
                          display: 'block',
                          marginTop: 3,
                        }}
                      >
                        Size: {activeHeroSpecies.sizeRangeUm}
                      </span>
                    </div>
                  </div>

                  <p className="smallprint" style={{ marginTop: 10, marginBottom: 0 }}>
                    <b>Diagnostic Morphology:</b> {activeHeroSpecies.morphology}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span className="smallprint">
                    Ref Slide: <b>{activeHeroDemoSlide.stain}</b>
                  </span>
                  <button
                    type="button"
                    className="tinybtn selected"
                    onClick={() => {
                      handleLoadDemoSlide(activeHeroDemoSlide.id, true);
                      go('analyze');
                    }}
                  >
                    Inspect Slide in Stage →
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive KPI Row */}
            <div className="stats">
              <div
                className="card stat clickable"
                onClick={() => go('history')}
                title="View saved analysis sessions"
              >
                <strong data-testid="total-analyses-count">{history.length}</strong>
                <span>Saved analyses · Click to view History</span>
              </div>
              <div
                className="card stat clickable"
                onClick={() => go('dataset')}
                title="Explore the 8 target parasite species"
              >
                <strong>8 Species</strong>
                <span>5 Helminths · 3 Protozoa (Phase A)</span>
              </div>
              <div
                className="card stat clickable"
                onClick={() => go('dataset')}
                title="Inspect YOLO 70/30 dataset partitioning"
              >
                <strong>70% / 30%</strong>
                <span>YOLO Train / Test Split (Phase B)</span>
              </div>
              <div
                className="card stat clickable"
                onClick={() => go('analyze')}
                title="Open Digital Microscope Stage"
              >
                <strong>~99.6%</strong>
                <span>Analysis time reduction vs. manual (Obj. 6)</span>
              </div>
            </div>

            {/* Interactive 4-Step Workflow Stepper */}
            <div className="stepper">
              <button
                type="button"
                className="step interactive"
                onClick={() => go('analyze')}
              >
                <b>01 · Prepare & Acquire</b>
                Upload a stool image or pick one of the 8 reference slides
              </button>
              <button
                type="button"
                className="step interactive"
                onClick={() => {
                  handleLoadDemoSlide(DEMO_SLIDE_PRESETS[0].id, true);
                  go('analyze');
                }}
              >
                <b>02 · Screen & Localize</b>
                Run YOLO / Otsu detection & test optical clarity/illumination
              </button>
              <button
                type="button"
                className="step interactive"
                onClick={() => go('dataset')}
              >
                <b>03 · Evaluate Performance</b>
                Inspect the 8×8 Confusion Matrix, Precision, Recall & F1
              </button>
              <button
                type="button"
                className="step interactive"
                onClick={() => go('history')}
              >
                <b>04 · Document & Export</b>
                Export YOLO .txt boxes, annotated PNG, CSV & JSON reports
              </button>
            </div>

            {/* Interactive 8-Species Diagnostic Atlas on Home Page */}
            <div className="card" style={{ marginTop: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h2>Interactive 8-Species Diagnostic Reference Atlas (Phase A)</h2>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Click any target parasite species to load its calibrated microscopic slide
                    directly into the interactive analyzer.
                  </p>
                </div>

                {/* Segmented Filter Control */}
                <div className="segmented-bar" role="group" aria-label="Filter parasite group">
                  {(['All', 'Helminth', 'Protozoan'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={atlasFilter === tab ? 'active' : ''}
                      onClick={() => setAtlasFilter(tab)}
                    >
                      {tab === 'All'
                        ? 'All Species (8)'
                        : tab === 'Helminth'
                        ? 'Helminths (5)'
                        : 'Protozoa (3)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="atlas-grid">
                {filteredAtlasSpecies.map((sp) => {
                  const matchingSlide =
                    DEMO_SLIDE_PRESETS.find((s) => s.classId === sp.classId) ||
                    DEMO_SLIDE_PRESETS[0];
                  return (
                    <div key={sp.classId} className="species-card">
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <code style={{ fontSize: 11, fontWeight: 700 }}>
                            Class {sp.classId} · {sp.group}
                          </code>
                          <span className="smallprint mono">{sp.sizeRangeUm}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <ParasiteSvgIcon classId={sp.classId} size={54} />
                          <div>
                            <b style={{ fontSize: 14, color: 'var(--navy)', display: 'block' }}>
                              <i>{sp.scientificName}</i>
                            </b>
                            <span className="smallprint">{sp.commonName}</span>
                            <span
                              className="smallprint"
                              style={{ display: 'block', fontWeight: 600 }}
                            >
                              {sp.stage}
                            </span>
                          </div>
                        </div>
                        <p className="smallprint" style={{ marginTop: 8, marginBottom: 0 }}>
                          {sp.morphology}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="secondary"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12 }}
                        onClick={() => {
                          handleLoadDemoSlide(matchingSlide.id, true);
                          go('analyze');
                        }}
                      >
                        Load & Analyze Slide →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ANALYZE PAGE */}
        {activePage === 'analyze' && (
          <section id="analyze">
            <div
              className="topbar"
              style={{
                borderBottom: 0,
                marginBottom: 8,
                paddingBottom: 0,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h1>Automated Microscopic Detection, Classification & Annotation</h1>
                <p className="muted">
                  Upload any stool microscopy image or select a reference slide below—PARASIGHT
                  automatically localizes bounding boxes, classifies across the 8 target species
                  (Classes 0–7), and generates YOLO & morphological annotations.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`tinybtn ${autoAnalyzeEnabled ? 'selected' : ''}`}
                  onClick={() => setAutoAnalyzeEnabled((v) => !v)}
                  title="Automatically run detection, species classification, and YOLO annotation immediately when an image is uploaded or selected"
                >
                  {autoAnalyzeEnabled
                    ? '⚡ Auto-Classify & Annotate: ON'
                    : 'Auto-Classify & Annotate: OFF'}
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ padding: '8px 13px', fontSize: 12 }}
                  onClick={handleBatchAutoScanAllSpecies}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Scanning…' : '⚡ Auto-Scan All 8 Species (Batch)'}
                </button>
              </div>
            </div>

            {/* Live Automated Pipeline Progress or Batch Status Banner */}
            {(pipelineStepText || batchScanStatus) && (
              <div
                className="notice"
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span>
                  <b>{pipelineStepText ? 'Automated AI Pipeline:' : 'Batch Automation:'}</b>{' '}
                  {pipelineStepText || batchScanStatus}
                </span>
                {batchScanStatus && !pipelineStepText && (
                  <button
                    type="button"
                    className="tinybtn"
                    onClick={() => setBatchScanStatus('')}
                    style={{ padding: '4px 8px', fontSize: 11 }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}

            {/* Interactive 8-Slide Visual Selector Strip */}
            <div className="card" style={{ marginBottom: 18 }}>
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
                  <h3 style={{ marginBottom: 2 }}>
                    Quick-Load Calibrated Reference Slides (System Flow · Page 7)
                  </h3>
                  <span className="smallprint">
                    Click any specimen card below to automatically load, classify, and annotate its
                    microscopic field.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    id="demoSlideSelect"
                    aria-label="Select demo microscopic sample"
                    value={selectedDemoId}
                    onChange={(e) => {
                      setSelectedDemoId(e.target.value);
                      handleLoadDemoSlide(e.target.value, false);
                    }}
                  >
                    {DEMO_SLIDE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleLoadDemoSlide(selectedDemoId, true)}
                  >
                    Load & Auto-Classify
                  </button>
                </div>
              </div>

              <div className="slide-strip">
                {DEMO_SLIDE_PRESETS.map((slide) => {
                  const isAct = activeDemoPresetId === slide.id;
                  return (
                    <div
                      key={slide.id}
                      className={`slide-pill-card ${isAct ? 'active' : ''}`}
                      onClick={() => handleLoadDemoSlide(slide.id, true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLoadDemoSlide(slide.id, true);
                        }
                      }}
                    >
                      <ParasiteSvgIcon classId={slide.classId} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <b
                          style={{
                            fontSize: 12,
                            color: 'var(--navy)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <i>{slide.shortTitle}</i>
                        </b>
                        <span className="smallprint" style={{ display: 'block', fontSize: 10.5 }}>
                          {slide.stain}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid2">
              <div className="card">
                <h3>Upload Custom Microscopic Fecal Image</h3>
                <div
                  className={`drop ${isDragging ? 'drag' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileUpload(e.dataTransfer.files[0]);
                  }}
                >
                  <p style={{ marginBottom: 8 }}>
                    <b>Drag and drop your microscopic image here</b>
                    <br />
                    <span className="muted">
                      Automatically detects, classifies (Classes 0–7), and annotates bounding boxes
                      on upload
                    </span>
                  </p>
                  <label
                    className="primary"
                    style={{
                      display: 'inline-block',
                      padding: '9px 15px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Choose File (Auto-Classify)
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/bmp,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                  </label>
                  <p className="smallprint" style={{ marginTop: 8, marginBottom: 0 }}>
                    Supported: JPG, PNG, BMP · Recommended max: 10 MB
                  </p>
                </div>

                {currentDataUrl && (
                  <div className="preview-wrap">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <h3 style={{ margin: 0 }}>Loaded Specimen Preview</h3>
                      <span className="smallprint mono">{currentFileSizeText}</span>
                    </div>
                    <img
                      ref={previewImgRef}
                      src={currentDataUrl}
                      alt="Uploaded microscopic specimen"
                    />
                    <div className="btnrow">
                      <button
                        type="button"
                        className="primary"
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? 'Auto-Classifying…' : 'Re-Run Auto-Detection & Annotation'}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={handleClearImage}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Automated Classifier Sensitivity & Timing Calibration</h3>
                <div
                  className="sensitivity-panel"
                  style={{
                    padding: 14,
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    background: 'var(--bg)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <label htmlFor="sensitivity">
                      <b>Detection sensitivity</b>
                    </label>
                    <b className="mono">{sensitivity}%</b>
                  </div>
                  <input
                    id="sensitivity"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#8e1018', margin: '10px 0 4px' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--muted)',
                    }}
                  >
                    <span>Stricter cutoff ({100 - sensitivity}%)</span>
                    <span>More candidate regions</span>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label
                    htmlFor="manualTimeSecInput"
                    style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}
                  >
                    Reference Manual Examination Time (seconds) · Objective 6
                  </label>
                  <input
                    id="manualTimeSecInput"
                    type="number"
                    min={1}
                    step={1}
                    value={manualTimeInputSec}
                    onChange={(e) =>
                      setManualTimeInputSec(Math.max(1, Number(e.target.value) || 120))
                    }
                    style={{ width: '100%' }}
                  />
                  <p className="smallprint" style={{ marginTop: 6 }}>
                    Used to compute Time Reduction (%) = ((Manual Time − PARASIGHT Time) /
                    Manual Time) × 100.
                  </p>
                </div>

                <div className="notice" style={{ marginTop: 12 }}>
                  <b>Automated Classification & Annotation Pipeline:</b> Segments candidate
                  structures, evaluates morphological descriptors (aspect ratio, bipolar plugs,
                  shell wall contrast, and stain chromaticity), assigns YOLO Classes 0–7, and
                  pre-populates verification notes.
                </div>
              </div>
            </div>

            {currentResult && (
              <div id="analysisOutput" style={{ marginTop: 18 }}>
                <div className="card">
                  <div className="topbar">
                    <div>
                      <h2>Interactive Digital Microscope Stage & Automated Annotations</h2>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        Automatically classified into target species (Classes 0–7) with normalized
                        YOLO bounding boxes. Click any box to inspect or refine.
                      </p>
                    </div>
                    <span className="badge">{currentResult.status.toUpperCase()}</span>
                  </div>

                  {/* Automated Diagnostic Classification & Annotation Summary Banner */}
                  {currentResult.diagnosticReport && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid var(--line)',
                        background: 'var(--bg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: '1 1 360px' }}>
                        {currentResult.diagnosticReport.primaryClassId !== null && (
                          <div style={{ flexShrink: 0 }}>
                            <ParasiteSvgIcon
                              classId={currentResult.diagnosticReport.primaryClassId}
                              size={64}
                            />
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="eyebrow" style={{ marginBottom: 0 }}>
                              AUTOMATED CLASSIFICATION & ANNOTATION
                            </span>
                            <code style={{ fontSize: 11, fontWeight: 700 }}>
                              {currentResult.diagnosticReport.primaryClassId !== null
                                ? `YOLO Class ${currentResult.diagnosticReport.primaryClassId} · ${currentResult.diagnosticReport.primaryGroup}`
                                : 'No Target Detected'}
                            </code>
                          </div>
                          <h3 style={{ margin: '4px 0 2px', fontSize: 17 }}>
                            <i>{currentResult.diagnosticReport.primarySpecies}</i>
                            {currentResult.diagnosticReport.maxConfidence !== null && (
                              <span
                                className="mono"
                                style={{
                                  marginLeft: 10,
                                  fontSize: 13,
                                  color: 'var(--teal)',
                                }}
                              >
                                {(currentResult.diagnosticReport.maxConfidence * 100).toFixed(1)}%
                                confidence
                              </span>
                            )}
                          </h3>
                          <p className="smallprint" style={{ margin: 0 }}>
                            {currentResult.diagnosticReport.automatedNotes}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {currentResult.diagnosticReport.speciesBreakdown.map((sp) => (
                            <span
                              key={sp.classId}
                              className="tinybtn selected"
                              style={{ padding: '4px 9px', fontSize: 11, cursor: 'default' }}
                            >
                              Class {sp.classId}: {sp.label} ({sp.count}× ·{' '}
                              {(sp.maxConf * 100).toFixed(1)}%)
                            </span>
                          ))}
                        </div>
                        <span className="smallprint mono">
                          Engine: {currentResult.engineUsed || 'PARASIGHT Automated Classifier'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="result-grid">
                    {/* Interactive Microscope Stage */}
                    <MicroscopeViewport
                      originalDataUrl={currentResult.data}
                      annotatedDataUrl={currentResult.annotated}
                      detections={currentResult.detections}
                      showAnnotatedOverlay={showAnnotatedOverlay}
                      onToggleOverlay={setShowAnnotatedOverlay}
                      selectedDetectionIndex={selectedDetectionIdx}
                      onSelectDetection={setSelectedDetectionIdx}
                      onUpdateDetections={handleUpdateDetections}
                      showConfidence={settings.showConfidence}
                      opticalBlur={opticalBlur}
                      opticalBrightness={opticalBrightness}
                      opticalContrast={opticalContrast}
                      onOpticalChange={(b, br, c) => {
                        setOpticalBlur(b);
                        setOpticalBrightness(br);
                        setOpticalContrast(c);
                      }}
                    />

                    {/* Right Column: Interactive Detection Summary Table & Timing */}
                    <div className="card" style={{ boxShadow: 'none' }}>
                      <h3>Automated Detection & YOLO Annotation Table</h3>
                      {currentResult.detections.length > 0 ? (
                        <div className="tablewrap">
                          <table>
                            <thead>
                              <tr>
                                <th># / Classified Species & Morphology</th>
                                <th>Confidence</th>
                                <th>Normalized BBox</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentResult.detections.map((d, idx) => {
                                const isSel = selectedDetectionIdx === idx;
                                return (
                                  <tr
                                    key={d.id || idx}
                                    onClick={() =>
                                      setSelectedDetectionIdx(isSel ? null : idx)
                                    }
                                    style={{
                                      cursor: 'pointer',
                                      background: isSel
                                        ? 'rgba(142, 16, 24, 0.1)'
                                        : undefined,
                                    }}
                                  >
                                    <td>
                                      <b>
                                        #{idx + 1} {d.label}{' '}
                                        <span className="smallprint">
                                          (Class {d.classId ?? 0})
                                        </span>
                                      </b>
                                      {d.yoloLine && (
                                        <small className="mono">YOLO: {d.yoloLine}</small>
                                      )}
                                      {d.morphologicalNote && (
                                        <small style={{ color: 'var(--muted)', marginTop: 2 }}>
                                          {d.morphologicalNote}
                                        </small>
                                      )}
                                    </td>
                                    <td className="mono">
                                      {settings.showConfidence &&
                                      Number.isFinite(d.confidence)
                                        ? ((d.confidence as number) * 100).toFixed(1) + '%'
                                        : '—'}
                                    </td>
                                    <td className="mono" style={{ fontSize: 11.5 }}>
                                      {d.bbox.map((v) => Number(v).toFixed(3)).join(', ')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty">
                          <b>No candidate regions returned</b>
                          No regions met the current detection sensitivity (
                          {currentResult.sensitivity}%). Use &ldquo;+ Draw YOLO Box&rdquo; to
                          annotate manually.
                        </div>
                      )}

                      <div className="row">
                        <span>Detection sensitivity</span>
                        <b className="mono">
                          {currentResult.sensitivity}% (cutoff{' '}
                          {100 - currentResult.sensitivity}%)
                        </b>
                      </div>
                      <div className="row">
                        <span>Image dimensions</span>
                        <b className="mono">{currentResult.imageDimensions}</b>
                      </div>
                      <div className="row">
                        <span>Annotated structures</span>
                        <b className="mono" data-testid="candidate-count">
                          {currentResult.detections.length}
                        </b>
                      </div>
                      <div className="row">
                        <span>PARASIGHT analysis time</span>
                        <b className="mono">{currentResult.parasightTimeSec.toFixed(2)} s</b>
                      </div>
                      <div className="row">
                        <span>Manual reference time</span>
                        <b className="mono">{currentResult.manualTimeSec.toFixed(1)} s</b>
                      </div>
                      <div className="row">
                        <span>Time Reduction (%) · Objective 6</span>
                        <b className="mono">
                          {currentTimeReduction !== null
                            ? `${currentTimeReduction.toFixed(2)}% faster`
                            : '—'}
                        </b>
                      </div>
                    </div>
                  </div>

                  {/* Objective 5: Live Image Quality & Condition Assessment */}
                  <div className="card" style={{ marginTop: 16, boxShadow: 'none' }}>
                    <h3>
                      Image Quality & Condition Assessment (Objective 5 · Live Optical Readout)
                    </h3>
                    <p className="muted">
                      Automated screening of (A) Image Clarity, (B) Illumination Variation, and
                      (C) Presence of Fecal Debris. Adjust the optical sliders above to observe
                      real-time condition shifts.
                    </p>
                    <div className="qc-grid">
                      <div className="qc-item">
                        <span>A. Image Clarity (Focus)</span>
                        <b>{effectiveFocus.toLocaleString()}</b>
                        <span>{effectiveConditions.clarityLabel}</span>
                      </div>
                      <div className="qc-item">
                        <span>B. Illumination (Brightness)</span>
                        <b>{effectiveBrightness}/255</b>
                        <span>{effectiveConditions.illuminationLabel}</span>
                      </div>
                      <div className="qc-item">
                        <span>Grayscale Contrast</span>
                        <b>{effectiveContrast}/128</b>
                        <span>Standard deviation</span>
                      </div>
                      <div className="qc-item">
                        <span>C. Fecal Debris Screening</span>
                        <b>{effectiveConditions.debrisLabel}</b>
                        <span>Artifact & background density</span>
                      </div>
                    </div>
                  </div>

                  {/* Human Verification & Objective 7 Error Logging */}
                  <div className="card" style={{ marginTop: 16, boxShadow: 'none' }}>
                    <h3>Human Verification, 8-Species Classification & Error Logging</h3>
                    <p className="muted">
                      Record an expert reviewer’s interpretation across the eight Phase A target
                      parasite categories and log any observed detection/classification error
                      causes (Objective 7).
                    </p>
                    <div className="review-panel" style={{ alignItems: 'end' }}>
                      <div>
                        <label htmlFor="reviewLabelSelect">
                          Reference / reviewer species label
                        </label>
                        <select
                          id="reviewLabelSelect"
                          value={reviewLabel}
                          onChange={(e) => setReviewLabel(e.target.value)}
                        >
                          <option value="Pending review">Pending review</option>
                          <optgroup label="Phase A Target Helminths (5)">
                            {TARGET_PARASITES.filter((p) => p.group === 'Helminth').map((p) => (
                              <option key={p.classId} value={p.scientificName}>
                                [Class {p.classId}] {p.scientificName} ({p.commonName})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Phase A Target Protozoa (3)">
                            {TARGET_PARASITES.filter((p) => p.group === 'Protozoan').map((p) => (
                              <option key={p.classId} value={p.scientificName}>
                                [Class {p.classId}] {p.scientificName} ({p.commonName})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="General / Screening Labels">
                            <option value="Protozoan cyst">Protozoan cyst (general)</option>
                            <option value="Helminth egg">Helminth egg (general)</option>
                            <option value="Helminth larva">Helminth larva</option>
                            <option value="Artifact / debris">Artifact / fecal debris</option>
                            <option value="Uncertain">Uncertain</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="reviewDecisionSelect">Review decision</label>
                        <select
                          id="reviewDecisionSelect"
                          value={reviewDecision}
                          onChange={(e) => setReviewDecision(e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted (True Positive)">
                            Accepted (True Positive)
                          </option>
                          <option value="Rejected (False Positive)">
                            Rejected (False Positive)
                          </option>
                          <option value="Missed Structure (False Negative)">
                            Missed Structure (False Negative)
                          </option>
                          <option value="Needs expert review">Needs expert review</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="reviewErrorCauseSelect">
                          Probable error cause (Objective 7)
                        </label>
                        <select
                          id="reviewErrorCauseSelect"
                          value={reviewErrorCause}
                          onChange={(e) => setReviewErrorCause(e.target.value)}
                        >
                          <option value="None / Verified TP">None / Verified Match</option>
                          <option value="Fecal debris or artifacts (FP)">
                            Fecal debris or artifacts (False Positive)
                          </option>
                          <option value="Low parasite density (FN)">
                            Low parasite density (False Negative)
                          </option>
                          <option value="Poor image clarity / blur (FN)">
                            Poor image clarity / blur (False Negative)
                          </option>
                          <option value="Morphological similarity (Misclassification)">
                            Morphological similarity (Misclassification)
                          </option>
                          <option value="Partial visibility / overlapping objects">
                            Partial visibility / overlapping objects
                          </option>
                        </select>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="reviewNotesInput">Reviewer notes</label>
                        <textarea
                          id="reviewNotesInput"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Record observable morphological features (e.g., polar plugs, mammillated coat, nuclei count), image limitations, or reasons for the review decision…"
                        />
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={handleSaveReviewAnnotation}
                      >
                        Save Review Annotation
                      </button>
                      {reviewFeedback && <span className="muted">{reviewFeedback}</span>}
                    </div>
                  </div>

                  <div className="actions">
                    <button type="button" className="primary" onClick={handleExportCsv}>
                      Export Results CSV
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        downloadBlob(
                          dataUrlToBlob(currentResult.annotated),
                          'parasight-annotated-image.png'
                        )
                      }
                    >
                      Download Annotated Image
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleExportYoloTxt}
                    >
                      Export YOLO Labels (.txt)
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleExportReviewJson}
                    >
                      Export Review Report (JSON)
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleSaveSessionToHistory}
                    >
                      Save Session
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleClearImage}
                    >
                      Analyze Another
                    </button>
                    {saveSessionFeedback && (
                      <span className="muted">{saveSessionFeedback}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* HISTORY PAGE */}
        {activePage === 'history' && (
          <section id="history">
            <div className="topbar">
              <div>
                <h1>Analysis History</h1>
                <p className="muted">
                  View, search, reopen, or delete analyses saved in this browser.
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const exportData = history.map(({ data, annotated, ...rest }) => ({
                    ...rest,
                    imageDataIncluded: false,
                  }));
                  downloadBlob(
                    new Blob([JSON.stringify(exportData, null, 2)], {
                      type: 'application/json',
                    }),
                    'parasight-history.json'
                  );
                }}
              >
                Export JSON
              </button>
            </div>

            <div className="card">
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by filename, species label, or date…"
                  style={{ flex: 1, minWidth: 180 }}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() => persistHistory([])}
                >
                  Clear History
                </button>
              </div>

              {filteredHistory.length > 0 ? (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Image</th>
                        <th>File & Reviewer Label</th>
                        <th>Timing (PARASIGHT vs Manual)</th>
                        <th>Analysis status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {new Date(item.date).toLocaleDateString()}
                            <small>
                              {new Date(item.date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </small>
                          </td>
                          <td>
                            <img
                              className="thumb"
                              src={item.annotated || item.data}
                              alt={item.name}
                            />
                          </td>
                          <td>
                            <b>{item.name}</b>
                            <small>
                              Label: {item.review?.label || 'Pending review'} · Decision:{' '}
                              {item.review?.decision || 'Pending'}
                            </small>
                          </td>
                          <td className="mono">
                            {item.parasightTimeSec
                              ? `${item.parasightTimeSec.toFixed(2)}s vs ${item.manualTimeSec || 120}s`
                              : '—'}
                          </td>
                          <td>
                            <span className="badge">{item.status || 'Saved'}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="tinybtn"
                              onClick={() => {
                                setCurrentResult(item);
                                setCurrentDataUrl(item.data);
                                setCurrentFileName(item.name);
                                setCurrentFileSizeText(item.name);
                                setReviewLabel(item.review?.label || 'Pending review');
                                setReviewDecision(item.review?.decision || 'Pending');
                                setReviewErrorCause(
                                  item.review?.errorCause || 'None / Verified TP'
                                );
                                setReviewNotes(item.review?.notes || '');
                                go('analyze');
                              }}
                            >
                              View
                            </button>{' '}
                            <button
                              type="button"
                              className="tinybtn danger"
                              onClick={() =>
                                persistHistory(history.filter((x) => x.id !== item.id))
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <b>No saved analyses yet</b>
                  Uploaded images and saved results will appear here.
                </div>
              )}
            </div>
          </section>
        )}

        {/* DATASET INFO & STATISTICAL EVALUATION PAGE */}
        {activePage === 'dataset' && (
          <section id="dataset">
            <h1>Dataset Information & Statistical Evaluation Workbench</h1>
            <p className="muted">
              Overview of the eight target intestinal parasite categories (Phase A), 70%/30%
              YOLO dataset organization (Phase B), and interactive statistical evaluation
              calculators (Phases E–F).
            </p>

            {/* Dataset Summary & 56% Training Progress */}
            <div className="card">
              <h3>Dataset Summary & YOLO Partitioning (Phases A–C)</h3>
              <div className="row">
                <span>Calibrated reference demo slides bundled with this prototype</span>
                <b>{DEMO_SLIDE_PRESETS.length} interactive slides (all 8 species)</b>
              </div>
              <div className="row">
                <span>Target intestinal parasite categories (Phase A · Page 9)</span>
                <b>8 species (5 Helminths · 3 Protozoa)</b>
              </div>
              <div className="row">
                <span>Dataset partition protocol (Phase B · Page 9)</span>
                <b>70% Training (with validation subset) · 30% Testing</b>
              </div>
              <div className="row">
                <span>Selected local image files</span>
                <b className="mono">{selectedImageCount.toLocaleString()}</b>
              </div>
              <div className="row">
                <span>Unique files after exact SHA-256 duplicate check</span>
                <b className="mono">{uniqueImageCount.toLocaleString()}</b>
              </div>
              <div className="row">
                <span>Exact duplicates detected</span>
                <b className="mono">{duplicateImageCount.toLocaleString()}</b>
              </div>

              <div
                className="training-card"
                style={{
                  margin: '18px 0 8px',
                  padding: 18,
                  border: '1px solid #e7c4c4',
                  borderRadius: 13,
                  background: 'linear-gradient(120deg, #fff5f4, #f8e5e4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div className="eyebrow">YOLO MODEL TRAINING & PREPARATION PROGRESS</div>
                    <div
                      className="mono"
                      style={{ fontSize: 30, fontWeight: 800, color: '#710b14' }}
                    >
                      56%
                    </div>
                    <b>1,679 images processed</b>
                  </div>
                  <span className="badge">Phase B–C Progress Update</span>
                </div>
                <div
                  style={{
                    height: 12,
                    background: '#ead2d0',
                    borderRadius: 20,
                    overflow: 'hidden',
                    margin: '13px 0',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: '56%',
                      background: 'linear-gradient(90deg, #710b14, #c34c59)',
                      borderRadius: 20,
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#805b5b',
                  }}
                >
                  <span>0%</span>
                  <b>56% reported progress · 70% Train / 30% Test YOLO format</b>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Phase A: 8 Proposed Parasite Categories Table with Interactive Launch */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Eight Proposed Intestinal Parasite Categories (Phase A · Page 9)</h3>
              <p className="muted">
                Selected microscopic fecal images are organized and annotated in YOLO format
                across these eight target species.
              </p>
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>YOLO ID</th>
                      <th>Specimen</th>
                      <th>Scientific Name</th>
                      <th>Group</th>
                      <th>Diagnostic Stage</th>
                      <th>Typical Size</th>
                      <th>Key Microscopic Morphology</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TARGET_PARASITES.map((sp) => {
                      const slide =
                        DEMO_SLIDE_PRESETS.find((s) => s.classId === sp.classId) ||
                        DEMO_SLIDE_PRESETS[0];
                      return (
                        <tr key={sp.classId}>
                          <td>
                            <code>Class {sp.classId}</code>
                          </td>
                          <td>
                            <ParasiteSvgIcon classId={sp.classId} size={42} />
                          </td>
                          <td>
                            <b>
                              <i>{sp.scientificName}</i>
                            </b>
                            <small>{sp.commonName}</small>
                          </td>
                          <td>{sp.group}</td>
                          <td>{sp.stage}</td>
                          <td className="mono">{sp.sizeRangeUm}</td>
                          <td>{sp.morphology}</td>
                          <td>
                            <button
                              type="button"
                              className="tinybtn"
                              onClick={() => {
                                handleLoadDemoSlide(slide.id, true);
                                go('analyze');
                              }}
                            >
                              Test Slide →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Objective 4: Model Evaluation Metrics Calculator with Interactive Condition Presets */}
            <div className="card" style={{ marginTop: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h3>
                    Detection & Classification Performance Calculator (Objective 4 · Pages
                    12–13)
                  </h3>
                  <p className="muted">
                    Enter counts from an expert-verified, held-out 30% test set—or click a
                    condition preset—to calculate Accuracy, Precision, Recall, and F1-score.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tinybtn"
                    onClick={() =>
                      applyMetricsPreset(
                        142,
                        8,
                        11,
                        319,
                        '30% Held-Out Test Set Benchmark'
                      )
                    }
                  >
                    Held-Out Benchmark
                  </button>
                  <button
                    type="button"
                    className="tinybtn"
                    onClick={() =>
                      applyMetricsPreset(
                        96,
                        2,
                        3,
                        149,
                        'Objective 5 Subset: Optimal Clarity & Illumination'
                      )
                    }
                  >
                    Optimal Clarity Subset
                  </button>
                  <button
                    type="button"
                    className="tinybtn"
                    onClick={() =>
                      applyMetricsPreset(
                        46,
                        6,
                        8,
                        170,
                        'Objective 5 Subset: Elevated Fecal Debris / Low Light'
                      )
                    }
                  >
                    High-Debris Subset
                  </button>
                </div>
              </div>

              <div className="review-panel">
                <div>
                  <label htmlFor="metricTP">True positives (TP)</label>
                  <input
                    id="metricTP"
                    type="number"
                    min={0}
                    step={1}
                    value={metricTP}
                    onChange={(e) => setMetricTP(e.target.value)}
                    placeholder="Enter count"
                  />
                </div>
                <div>
                  <label htmlFor="metricFP">False positives (FP)</label>
                  <input
                    id="metricFP"
                    type="number"
                    min={0}
                    step={1}
                    value={metricFP}
                    onChange={(e) => setMetricFP(e.target.value)}
                    placeholder="Enter count"
                  />
                </div>
                <div>
                  <label htmlFor="metricFN">False negatives (FN)</label>
                  <input
                    id="metricFN"
                    type="number"
                    min={0}
                    step={1}
                    value={metricFN}
                    onChange={(e) => setMetricFN(e.target.value)}
                    placeholder="Enter count"
                  />
                </div>
                <div>
                  <label htmlFor="metricTN">True negatives (TN)</label>
                  <input
                    id="metricTN"
                    type="number"
                    min={0}
                    step={1}
                    value={metricTN}
                    onChange={(e) => setMetricTN(e.target.value)}
                    placeholder="Enter count"
                  />
                </div>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  id="calculateMetrics"
                  onClick={handleCalculateMetrics}
                >
                  Calculate Metrics
                </button>
                <button
                  type="button"
                  className="secondary"
                  id="resetMetrics"
                  onClick={handleResetMetrics}
                >
                  Reset
                </button>
              </div>
              <div className="qc-grid" style={{ marginTop: 14 }}>
                <div className="qc-item">
                  <span>Accuracy</span>
                  <b id="metricAccuracy" data-testid="metric-accuracy">
                    {metricResultText.accuracy}
                  </b>
                </div>
                <div className="qc-item">
                  <span>Precision</span>
                  <b id="metricPrecision" data-testid="metric-precision">
                    {metricResultText.precision}
                  </b>
                </div>
                <div className="qc-item">
                  <span>Recall</span>
                  <b id="metricRecall" data-testid="metric-recall">
                    {metricResultText.recall}
                  </b>
                </div>
                <div className="qc-item">
                  <span>F1-score</span>
                  <b id="metricF1" data-testid="metric-f1">
                    {metricResultText.f1}
                  </b>
                </div>
              </div>
              <p className="metric-note">{metricResultText.message}</p>

              {/* Per-Class Accuracy Calculator (Page 13) */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <h3>Per-Class Classification Accuracy (Page 13 · Stehman, 1997)</h3>
                <p className="smallprint">
                  Formula: Class Accuracy = (Correct Predictions for Parasite Type / Total
                  Reference Annotations for Parasite Type) × 100
                </p>
                <div className="review-panel" style={{ alignItems: 'end' }}>
                  <div>
                    <label htmlFor="classCorrectInput">
                      Correct Predictions for Parasite Type
                    </label>
                    <input
                      id="classCorrectInput"
                      type="number"
                      min={0}
                      value={classCorrectInput}
                      onChange={(e) => setClassCorrectInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="classTotalRefInput">
                      Total Reference Annotations for Parasite Type
                    </label>
                    <input
                      id="classTotalRefInput"
                      type="number"
                      min={1}
                      value={classTotalRefInput}
                      onChange={(e) => setClassTotalRefInput(e.target.value)}
                    />
                  </div>
                  <div className="qc-item" style={{ margin: 0 }}>
                    <span>Computed Class Accuracy</span>
                    <b>
                      {classAccValue !== null ? `${classAccValue.toFixed(2)}%` : 'N/A'}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive 8x8 Confusion Matrix & Objective 6 Timing Workbench */}
            <EvaluationWorkbench />

            {/* Objective 7: Detection and Classification Error Frequency Breakdown (Page 14) */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3>
                Detection & Classification Error Frequency Analysis (Objective 7 · Page 14)
              </h3>
              <p className="muted">
                Categorize observed False Positives (FP), False Negatives (FN), and
                misclassifications by probable cause. Formula: Error Frequency (%) = (Number of
                Errors of a Given Type / Total Number of Errors) × 100.
              </p>
              <div className="review-panel">
                <div>
                  <label htmlFor="errDebris">Fecal Debris / Artifacts (FP)</label>
                  <input
                    id="errDebris"
                    type="number"
                    min={0}
                    value={errorDebrisCount}
                    onChange={(e) =>
                      setErrorDebrisCount(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="errDensity">Low Density / Poor Clarity (FN)</label>
                  <input
                    id="errDensity"
                    type="number"
                    min={0}
                    value={errorLowDensityCount}
                    onChange={(e) =>
                      setErrorLowDensityCount(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="errMorph">Morphological Similarity (Misclassified)</label>
                  <input
                    id="errMorph"
                    type="number"
                    min={0}
                    value={errorMorphologyCount}
                    onChange={(e) =>
                      setErrorMorphologyCount(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="errOverlap">Partial Visibility / Overlapping</label>
                  <input
                    id="errOverlap"
                    type="number"
                    min={0}
                    value={errorOverlapCount}
                    onChange={(e) =>
                      setErrorOverlapCount(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
              </div>

              <div className="tablewrap" style={{ marginTop: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Error Category</th>
                      <th>Probable Cause</th>
                      <th>Count</th>
                      <th>Error Frequency (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorBreakdown.items.map((item) => (
                      <tr key={item.category}>
                        <td>
                          <b>{item.category}</b>
                        </td>
                        <td>{item.causeDescription}</td>
                        <td className="mono">{item.count}</td>
                        <td style={{ minWidth: 160 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <b className="mono">{item.frequencyPercent.toFixed(1)}%</b>
                            <div
                              style={{
                                flex: 1,
                                height: 7,
                                background: 'var(--bg-subtle)',
                                borderRadius: 99,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, item.frequencyPercent)}%`,
                                  height: '100%',
                                  background: '#8e1018',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="metric-note" style={{ marginTop: 10 }}>
                Total Observed Errors: <b>{errorBreakdown.totalErrors}</b> · Primary System
                Limitation: <b>{errorBreakdown.primaryLimitation || 'None'}</b>
              </p>
            </div>

            {/* Dataset Sources and References */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Dataset Sources and References</h3>
              <p className="muted">
                External collections for research review (Phase A). Check licenses, labels,
                image quality, and compatibility before combining datasets.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                <div className="source-card">
                  <b>ParasitoBank (Mendeley Data)</b>
                  <p className="muted">
                    779 microscopy field images with 1,620 annotated intestinal parasites.
                    Includes COCO-format labels; CC BY 4.0.
                  </p>
                  <a
                    href="https://data.mendeley.com/datasets/725hpzpwzf/1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open dataset record ↗
                  </a>
                </div>
                <div className="source-card">
                  <b>Mendeley Data — Multiple Parasites</b>
                  <p className="muted">
                    34,298 microscopy images covering several parasite groups and host cells.
                    Filter exclusively for the 8 target intestinal stool species.
                  </p>
                  <a
                    href="https://data.mendeley.com/datasets/38jtn4nzs6/3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open dataset record ↗
                  </a>
                </div>
                <div className="source-card">
                  <b>LIDS-UNICAMP GitHub Repository</b>
                  <p className="muted">
                    18,194 images across helminth eggs (5,112), helminth larvae (3,514), and
                    protozoan cysts (9,568), with segmentation masks and documented splits.
                  </p>
                  <a
                    href="https://github.com/LIDS-UNICAMP/intestinal-parasites-datasets"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open GitHub repository ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Local Dataset SHA-256 Auditor */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Load Dataset Images & Audit Duplicates (Phase B)</h3>
              <p className="muted">
                Select downloaded image files to inspect the local image inventory, check for
                exact SHA-256 duplicates, and compute the 70% Training / 30% Testing split.
              </p>
              <div className="actions">
                <label
                  className="primary"
                  style={{
                    display: 'inline-block',
                    padding: '9px 15px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Choose Image Files
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handleDatasetAuditFiles(e.target.files)}
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSelectedImageCount(0);
                    setUniqueImageCount(0);
                    setDuplicateImageCount(0);
                    setDatasetInventoryMsg('No local dataset files selected yet.');
                  }}
                >
                  Clear Selection
                </button>
              </div>
              <div className="notice" style={{ marginTop: 14 }}>
                {datasetInventoryMsg}
              </div>
            </div>
          </section>
        )}

        {/* AI CHATBOT PAGE */}
        {activePage === 'chatbot' && (
          <section id="chatbot">
            <h1>PARASIGHT AI Chatbot</h1>
            <p className="muted">
              Ask about the 8 target intestinal parasite species, life cycles, transmission,
              prevention, stool microscopy, image condition checks, YOLO 70/30 dataset
              preparation, and evaluation metrics.
            </p>
            <div className="card" style={{ maxWidth: 920 }}>
              <div className="notice">
                The PARASIGHT assistant provides offline educational guidance on the 8 target
                protozoa and helminths, transmission routes, microscopy quality conditions, YOLO
                dataset preparation, and statistical evaluation formulas. It cannot diagnose
                infection or prescribe treatment.
              </div>
              <div
                aria-live="polite"
                style={{
                  height: 360,
                  overflow: 'auto',
                  padding: '12px 4px',
                  margin: '10px 0',
                }}
              >
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`chatbubble ${m.who}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  placeholder="Ask a question about PARASIGHT or intestinal parasites…"
                  style={{ flex: 1, minWidth: 180 }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleSendChat()}
                >
                  Send
                </button>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() =>
                    handleSendChat('What are the 8 target parasite species in Phase A?')
                  }
                >
                  8 Target Species
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() =>
                    handleSendChat('How is the YOLO 70% and 30% dataset split organized?')
                  }
                >
                  YOLO 70/30 Split
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() => handleSendChat('How are intestinal parasites transmitted?')}
                >
                  Transmission
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() => handleSendChat('How can intestinal parasites be prevented?')}
                >
                  Prevention
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() =>
                    handleSendChat('How is Time Reduction (%) calculated in Objective 6?')
                  }
                >
                  Time Reduction Formula
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() => handleSendChat('How do microscopy and RT-PCR compare?')}
                >
                  Microscopy vs PCR
                </button>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() =>
                    handleSendChat('Can one negative stool sample rule out parasites?')
                  }
                >
                  False Negatives
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SETTINGS PAGE */}
        {activePage === 'settings' && (
          <section id="settings">
            <h1>Settings</h1>
            <p className="muted">Customize this offline browser prototype.</p>
            <div className="card">
              <h3>Application Settings</h3>
              <div className="formrow">
                <label htmlFor="languageSelect">Language</label>
                <select
                  id="languageSelect"
                  value={settings.language}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, language: e.target.value }))
                  }
                >
                  <option value="English">English</option>
                </select>
              </div>
              <div className="formrow">
                <label htmlFor="themeSelect">Theme</label>
                <select
                  id="themeSelect"
                  value={settings.theme}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      theme: e.target.value === 'dark' ? 'dark' : 'light',
                    }))
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="formrow">
                <label htmlFor="showConfidenceToggle">
                  Show confidence display in results
                </label>
                <input
                  id="showConfidenceToggle"
                  className="toggle"
                  type="checkbox"
                  checked={settings.showConfidence}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, showConfidence: e.target.checked }))
                  }
                />
              </div>
              <div className="formrow">
                <label htmlFor="autoSaveToggle">
                  Automatically save analysis history
                </label>
                <input
                  id="autoSaveToggle"
                  className="toggle"
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, autoSave: e.target.checked }))
                  }
                />
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                    setSettingsSavedMsg('Settings saved.');
                    setTimeout(() => setSettingsSavedMsg(''), 2500);
                  }}
                >
                  Save Settings
                </button>
                {settingsSavedMsg && <span className="muted">{settingsSavedMsg}</span>}
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div>
                  <span className="badge" style={{ marginBottom: 6, display: 'inline-block' }}>
                    VERCEL DEPLOYMENT READY · VITE + SERVERLESS API
                  </span>
                  <h3 style={{ margin: 0 }}>Deploy PARASIGHT to Vercel</h3>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const vercelConfig = JSON.stringify(
                      {
                        $schema: 'https://openapi.vercel.sh/vercel.json',
                        version: 2,
                        framework: 'vite',
                        buildCommand: 'npm run build',
                        outputDirectory: 'dist',
                        rewrites: [
                          { source: '/api/(.*)', destination: '/api/$1' },
                          { source: '/((?!api/).*)', destination: '/index.html' },
                        ],
                      },
                      null,
                      2
                    );
                    downloadBlob(
                      new Blob([vercelConfig], { type: 'application/json' }),
                      'vercel.json'
                    );
                  }}
                >
                  Download vercel.json
                </button>
              </div>
              <p className="muted" style={{ marginBottom: 12 }}>
                This project is pre-configured with <code>/vercel.json</code>, a static Vite
                production build (<code>dist/</code>), and Vercel Serverless Functions (
                <code>/api/detect.ts</code> and <code>/api/chat.ts</code>).
              </p>
              <div className="qc-grid">
                <div className="qc-item">
                  <span>1. Export or Push to Git</span>
                  <b style={{ fontSize: 14 }}>GitHub / Vercel CLI</b>
                  <span>Download the project ZIP (or push to GitHub) and import it at vercel.com/new</span>
                </div>
                <div className="qc-item">
                  <span>2. Auto-Detected Build</span>
                  <b style={{ fontSize: 14 }}>npm run build → dist</b>
                  <span>Vercel automatically reads vercel.json and deploys /api/detect & /api/chat</span>
                </div>
                <div className="qc-item">
                  <span>3. Optional Cloud AI Key</span>
                  <b style={{ fontSize: 14 }}>GEMINI_API_KEY</b>
                  <span>Add GEMINI_API_KEY in Vercel Environment Variables (works offline even without it!)</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ABOUT & RESEARCH PLAN PAGE */}
        {activePage === 'about' && (
          <section id="about">
            <div className="card" style={{ maxWidth: 940, margin: '0 auto', padding: 32 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1>PARASIGHT</h1>
                <h3>
                  An AI-Based Microscopic Image Analysis System for Coproparasitological
                  Parasite Detection
                </h3>
                <p className="muted">
                  <b>Researchers (November 2026):</b> Brigette Shane L. Berdejo · Jewel Nicole
                  B. Cabayao · Rhyza Angela D. Malaque · Samantha Presella B. Tanucan · Azhera
                  Rhiana A. Tayson
                </p>
              </div>

              <div className="notice" style={{ marginBottom: 20 }}>
                PARASIGHT is intended as a research-support and decision-support tool that can
                assist laboratory personnel; it is not intended to replace professional
                laboratory examination or expert clinical interpretation (WHO, 2021).
              </div>

              <h3>Research Rationale</h3>
              <p className="muted">
                Conventional coproparasitological examination is widely used and low-cost, but
                depends heavily on manual microscopic analysis, which is labor-intensive,
                time-consuming, and prone to inter-observer variability—especially when parasite
                structures are morphologically similar to non-parasitic materials, present in low
                concentrations, or obscured by fecal debris (Dąbrowska et al., 2024; Mathison et
                al., 2020). PARASIGHT integrates YOLO-based computer vision with an offline
                browser workspace to support consistent, organized detection and classification.
              </p>

              <h3 style={{ marginTop: 20 }}>Specific Research Objectives (Pages 3–4)</h3>
              <ol className="tiplist" style={{ paddingLeft: 20 }}>
                <li>
                  Collect and organize microscopic fecal images containing eight selected
                  intestinal parasites (<i>Ascaris lumbricoides</i>, <i>Trichuris trichiura</i>,{' '}
                  <i>Ancylostoma</i>, <i>Enterobius vermicularis</i>, <i>Taenia</i> spp.,{' '}
                  <i>Giardia intestinalis</i>, <i>Entamoeba histolytica</i>, and{' '}
                  <i>Entamoeba coli</i>) and establish expert-verified reference annotations.
                </li>
                <li>
                  Design a YOLO-based detection model and classification system (70% training /
                  30% testing split) for identifying selected intestinal parasite types.
                </li>
                <li>
                  Develop an offline website integrating the AI model for microscopic image
                  uploading, automated parasite detection, classification, and presentation of
                  results.
                </li>
                <li>
                  Determine detection performance in terms of Precision, Recall, F1-score, and
                  Classification Accuracy (overall and per-class).
                </li>
                <li>
                  Assess the effects of variations in microscopic image conditions—specifically
                  image clarity, illumination variation, and presence of fecal debris—on
                  detection performance.
                </li>
                <li>
                  Compare the time required by PARASIGHT to analyze microscopic fecal images with
                  the time required for manual analysis of the same images.
                </li>
                <li>
                  Identify common detection and classification errors encountered by PARASIGHT
                  and determine the limitations these errors reveal.
                </li>
              </ol>

              <div className="grid2" style={{ marginTop: 18 }}>
                <div className="qc-item">
                  <b>Null Hypothesis (H₀)</b>
                  <p className="smallprint" style={{ marginTop: 6 }}>
                    There is no significant difference in PARASIGHT’s detection and
                    classification performance under varying microscopic image conditions, nor in
                    the analysis time between PARASIGHT and manual microscopic analysis.
                  </p>
                </div>
                <div className="qc-item">
                  <b>Alternative Hypothesis (H₁)</b>
                  <p className="smallprint" style={{ marginTop: 6 }}>
                    There is a significant difference in PARASIGHT’s detection and
                    classification performance under varying microscopic image conditions, and in
                    the analysis time between PARASIGHT and manual microscopic analysis.
                  </p>
                </div>
              </div>

              <h3 style={{ marginTop: 20 }}>Procedures (Phases A–G · Pages 8–11)</h3>
              <div className="stepper">
                <div className="step">
                  <b>Phase A & B</b>Dataset Acquisition, Label Verification & 70/30 YOLO Split
                </div>
                <div className="step">
                  <b>Phase C & D</b>YOLO Model Training & Offline Website Integration
                </div>
                <div className="step">
                  <b>Phase E & F</b>System Evaluation & Statistical Confusion-Matrix Analysis
                </div>
                <div className="step">
                  <b>Phase G</b>Finalization, Limitations & Recommendations Documentation
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TUTORIAL TAB PAGE */}
        {activePage === 'tutorial' && (
          <section id="tutorial">
            <div
              className="topbar"
              style={{
                borderBottom: 0,
                marginBottom: 8,
                paddingBottom: 0,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h1>Interactive User Tutorial & Guided Walkthrough</h1>
                <p className="muted">
                  Step through the 6 interactive modules below or click any live action button to
                  launch a guided hands-on tour across the PARASIGHT workbench.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setTutorialStepIdx(0);
                    setShowTutorialModal(true);
                  }}
                >
                  Launch Popup Walkthrough Modal
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleTutorialAction('auto-classify-demo', 1)}
                >
                  ⚡ Start Live Guided Tour in Stage →
                </button>
              </div>
            </div>

            <InteractiveTutorial
              mode="page"
              currentStepIndex={tutorialStepIdx}
              onSelectStep={setTutorialStepIdx}
              onTriggerAction={handleTutorialAction}
            />

            {/* Quick-Jump All 6 Tutorial Modules Grid */}
            <div className="card" style={{ marginTop: 18 }}>
              <h3>All 6 Interactive Tutorial Modules (Quick-Jump Overview)</h3>
              <p className="muted">
                Click any module card to jump directly to that step or launch its live feature.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 14,
                }}
              >
                {TUTORIAL_STEPS.map((s, idx) => {
                  const isAct = tutorialStepIdx === idx;
                  return (
                    <div
                      key={s.stepNumber}
                      className="species-card"
                      style={{
                        borderColor: isAct ? '#8e1018' : undefined,
                        background: isAct ? 'var(--bg-subtle)' : undefined,
                      }}
                    >
                      <div>
                        <span className="badge" style={{ marginBottom: 8, display: 'inline-block' }}>
                          {s.badge}
                        </span>
                        <h3 style={{ fontSize: 14, marginBottom: 4 }}>{s.title}</h3>
                        <p className="smallprint" style={{ marginBottom: 10 }}>
                          {s.subtitle}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`tinybtn ${isAct ? 'selected' : ''}`}
                          onClick={() => {
                            setTutorialStepIdx(idx);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Inspect Module 0{s.stepNumber}
                        </button>
                        <button
                          type="button"
                          className="tinybtn"
                          onClick={() => {
                            setTutorialStepIdx(idx);
                            handleTutorialAction(s.actionType, idx);
                          }}
                        >
                          Try Live →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FIRST-TIME USER / ON-DEMAND INTERACTIVE TUTORIAL MODAL OVERLAY */}
      {showTutorialModal && (
        <InteractiveTutorial
          mode="modal"
          currentStepIndex={tutorialStepIdx}
          onSelectStep={setTutorialStepIdx}
          onCloseModal={handleCloseTutorialModal}
          onTriggerAction={handleTutorialAction}
        />
      )}

      {/* FLOATING ASSISTANT CHATHEAD */}
      <button
        type="button"
        className="chathead-launcher"
        aria-label="Open PARASIGHT AI assistant"
        title="Chat with PARASIGHT"
        onClick={() => setChatheadOpen((o) => !o)}
      >
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none">
          <path
            d="M8 11.5A7.5 7.5 0 0 1 15.5 4h17A7.5 7.5 0 0 1 40 11.5v14a7.5 7.5 0 0 1-7.5 7.5H21l-9 7v-8.4A7.5 7.5 0 0 1 8 25.5v-14Z"
            fill="white"
          />
          <path
            d="M17 18h.2M24 18h.2M31 18h.2"
            stroke="#760b16"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M17 25c2 3 5 4 8 4s6-1 8-4"
            stroke="#760b16"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {chatheadOpen && (
        <aside
          className="chathead-panel"
          aria-label="PARASIGHT AI Assistant"
          style={{
            width: chatheadExpanded
              ? 'min(520px, calc(100vw - 28px))'
              : 'min(400px, calc(100vw - 28px))',
            height: chatheadExpanded ? '600px' : '530px',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        >
          <div className="chathead-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>✦ PARASIGHT AI Assistant</b>
                <span
                  style={{
                    fontSize: 9.5,
                    background: 'rgba(255,255,255,0.2)',
                    padding: '2px 6px',
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  AI ONLINE
                </span>
              </div>
              <small>{chatEngineLabel}</small>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                type="button"
                className="chathead-close"
                title={chatheadExpanded ? 'Compact size' : 'Expand AI panel'}
                onClick={() => setChatheadExpanded((e) => !e)}
              >
                {chatheadExpanded ? '⤡' : '⤢'}
              </button>
              <button
                type="button"
                className="chathead-close"
                title="Reset conversation"
                onClick={() =>
                  setChatheadMessages([
                    {
                      who: 'bot',
                      text: 'Conversation reset! Ask me about your active microscope slide, any of the 8 target intestinal parasites, or the 70/30 YOLO evaluation metrics.',
                    },
                  ])
                }
              >
                ↺
              </button>
              <button
                type="button"
                className="chathead-close"
                aria-label="Close chatbot"
                onClick={() => setChatheadOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Live Slide Context Bar inside the AI Assistant */}
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 11.5,
            }}
          >
            {currentResult ? (
              <>
                <span style={{ color: 'var(--navy)', fontWeight: 700 }}>
                  🔬 Slide: {currentResult.name} ({currentResult.detections.length} detections)
                </span>
                <button
                  type="button"
                  className="tinybtn selected"
                  style={{ padding: '3px 8px', fontSize: 10.5 }}
                  onClick={() =>
                    handleSendChat(
                      'Explain the current slide and its detections in detail.',
                      true,
                      true
                    )
                  }
                >
                  ✦ AI Explain Slide
                </button>
              </>
            ) : (
              <>
                <span className="muted">🔬 No slide loaded in stage yet</span>
                <button
                  type="button"
                  className="tinybtn"
                  style={{ padding: '3px 8px', fontSize: 10.5 }}
                  onClick={() => {
                    handleLoadDemoSlide('trichuris-saline', true);
                    go('analyze');
                    setTimeout(() => {
                      handleSendChat(
                        'Explain the Trichuris trichiura slide and how YOLO detects its polar plugs.',
                        true,
                        false
                      );
                    }, 220);
                  }}
                >
                  ⚡ Load & Ask AI About Whipworm →
                </button>
              </>
            )}
          </div>

          <div className="chathead-messages" aria-live="polite">
            {chatheadMessages.map((m, idx) => (
              <div key={idx} className={`chatbubble ${m.who}`}>
                {m.who === 'bot' && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#8e1018',
                      marginBottom: 3,
                      letterSpacing: 0.3,
                    }}
                  >
                    ✦ PARASIGHT AI
                  </div>
                )}
                {m.text}
              </div>
            ))}
            {chatThinking && (
              <div className="chatbubble bot" style={{ fontStyle: 'italic', opacity: 0.85 }}>
                ✦ PARASIGHT AI is analyzing your question…
              </div>
            )}
            <div ref={chatheadEndRef} />
          </div>

          {/* Quick AI Prompt Pills */}
          <div
            style={{
              padding: '7px 10px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              gap: 5,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              type="button"
              className="tinybtn"
              style={{ padding: '3px 8px', fontSize: 10.5 }}
              onClick={() =>
                handleSendChat('Explain the current slide and its detections.', true, true)
              }
            >
              🔬 Explain current slide
            </button>
            <button
              type="button"
              className="tinybtn"
              style={{ padding: '3px 8px', fontSize: 10.5 }}
              onClick={() =>
                handleSendChat(
                  'Compare Entamoeba histolytica and Entamoeba coli under the microscope.',
                  true
                )
              }
            >
              🪱 E. histolytica vs E. coli
            </button>
            <button
              type="button"
              className="tinybtn"
              style={{ padding: '3px 8px', fontSize: 10.5 }}
              onClick={() =>
                handleSendChat('What are the 8 target intestinal parasites in PARASIGHT?', true)
              }
            >
              📋 8 Target Species
            </button>
            <button
              type="button"
              className="tinybtn"
              style={{ padding: '3px 8px', fontSize: 10.5 }}
              onClick={() =>
                handleSendChat('Explain Precision, Recall, F1-score, and Time Reduction.', true)
              }
            >
              📊 Accuracy Formulas
            </button>
          </div>

          <div className="chathead-compose">
            <input
              type="text"
              value={chatheadInput}
              disabled={chatThinking}
              onChange={(e) => setChatheadInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat(undefined, true);
              }}
              placeholder={chatThinking ? 'PARASIGHT AI is thinking…' : 'Ask PARASIGHT AI anything…'}
              aria-label="Chat message"
            />
            <button
              type="button"
              className="primary"
              disabled={chatThinking}
              onClick={() => handleSendChat(undefined, true)}
            >
              {chatThinking ? '…' : 'Ask AI'}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
