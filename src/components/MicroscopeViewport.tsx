import React, { useState, useRef } from 'react';
import { DetectionCandidate } from '../utils/imageAnalysis';
import { TARGET_PARASITES, formatYoloAnnotation } from '../utils/parasightLogic';

interface MicroscopeViewportProps {
  originalDataUrl: string;
  annotatedDataUrl: string;
  detections: DetectionCandidate[];
  showAnnotatedOverlay: boolean;
  onToggleOverlay: (show: boolean) => void;
  selectedDetectionIndex: number | null;
  onSelectDetection: (idx: number | null) => void;
  onUpdateDetections: (next: DetectionCandidate[]) => void;
  showConfidence: boolean;
  opticalBlur: number;
  opticalBrightness: number;
  opticalContrast: number;
  onOpticalChange: (blur: number, brightness: number, contrast: number) => void;
}

export const MicroscopeViewport: React.FC<MicroscopeViewportProps> = ({
  originalDataUrl,
  detections,
  showAnnotatedOverlay,
  onToggleOverlay,
  selectedDetectionIndex,
  onSelectDetection,
  onUpdateDetections,
  showConfidence,
  opticalBlur,
  opticalBrightness,
  opticalContrast,
  onOpticalChange,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [newBoxClassId, setNewBoxClassId] = useState<number>(-1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{
    normX: number;
    normY: number;
    umX: number;
    umY: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getRelativeCoords(e);
    setCursorCoords({
      normX: x,
      normY: y,
      umX: Math.round(x * 360),
      umY: Math.round(y * 260),
    });
    if (drawMode && dragStart) {
      setDragCurrent({ x, y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawMode) return;
    const { x, y } = getRelativeCoords(e);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!drawMode || !dragStart || !dragCurrent) return;
    const minX = Math.min(dragStart.x, dragCurrent.x);
    const minY = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);

    setDragStart(null);
    setDragCurrent(null);

    if (w < 0.02 || h < 0.02) return;

    let resolvedClassId = newBoxClassId;
    if (resolvedClassId === -1) {
      // Auto-classify based on dominant slide species or drawn aspect ratio
      if (detections.length > 0 && typeof detections[0].classId === 'number') {
        resolvedClassId = detections[0].classId;
      } else {
        const aspect = Math.max(w, h) / Math.max(0.001, Math.min(w, h));
        resolvedClassId = aspect >= 1.65 ? 1 : aspect >= 1.2 ? 0 : 4;
      }
    }

    const sp = TARGET_PARASITES.find((p) => p.classId === resolvedClassId) || TARGET_PARASITES[0];
    const bbox: [number, number, number, number] = [minX, minY, w, h];
    const newCandidate: DetectionCandidate = {
      id: `manual-${Date.now()}`,
      label: sp.scientificName,
      classId: sp.classId,
      confidence: newBoxClassId === -1 ? 0.94 : 1.0,
      bbox,
      normalized: true,
      yoloLine: formatYoloAnnotation(sp.classId, bbox),
      morphologicalNote: sp.morphology,
      group: sp.group,
      stage: sp.stage,
      source: 'manual',
    };
    const next = [...detections, newCandidate];
    onUpdateDetections(next);
    onSelectDetection(next.length - 1);
    setDrawMode(false);
  };

  const selectedDet =
    selectedDetectionIndex !== null && detections[selectedDetectionIndex]
      ? detections[selectedDetectionIndex]
      : null;

  const handleChangeSelectedSpecies = (newClassId: number) => {
    if (selectedDetectionIndex === null || !selectedDet) return;
    const sp = TARGET_PARASITES.find((p) => p.classId === newClassId) || TARGET_PARASITES[0];
    const updated: DetectionCandidate = {
      ...selectedDet,
      label: sp.scientificName,
      classId: sp.classId,
      yoloLine: formatYoloAnnotation(sp.classId, selectedDet.bbox),
      morphologicalNote: sp.morphology,
      group: sp.group,
      stage: sp.stage,
    };
    const next = detections.map((d, i) => (i === selectedDetectionIndex ? updated : d));
    onUpdateDetections(next);
  };

  const handleDeleteSelected = () => {
    if (selectedDetectionIndex === null) return;
    const next = detections.filter((_, i) => i !== selectedDetectionIndex);
    onUpdateDetections(next);
    onSelectDetection(null);
  };

  return (
    <div>
      {/* Interactive Stage Toolbar */}
      <div
        className="image-tools"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg)',
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tinybtn ${showAnnotatedOverlay ? 'selected' : ''}`}
            onClick={() => onToggleOverlay(true)}
          >
            Show Annotations ({detections.length})
          </button>
          <button
            type="button"
            className={`tinybtn ${!showAnnotatedOverlay ? 'selected' : ''}`}
            onClick={() => onToggleOverlay(false)}
          >
            Show Original
          </button>
          <button
            type="button"
            className={`tinybtn ${drawMode ? 'selected' : ''}`}
            onClick={() => {
              setDrawMode((d) => !d);
              if (!showAnnotatedOverlay) onToggleOverlay(true);
            }}
            title="Drag on the microscope image to add a custom YOLO bounding box"
          >
            {drawMode ? '✕ Cancel Box Draw' : '+ Draw YOLO Box'}
          </button>
        </div>

        {/* Magnification Zoom Controls */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span className="smallprint" style={{ marginRight: 4 }}>
            Zoom:
          </span>
          {[1, 1.5, 2, 2.5].map((z) => (
            <button
              key={z}
              type="button"
              className={`tinybtn ${zoom === z ? 'selected' : ''}`}
              onClick={() => setZoom(z)}
              style={{ padding: '5px 8px' }}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Draw Mode Species Bar */}
      {drawMode && (
        <div
          className="notice"
          style={{
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <b>Annotation Mode Active:</b> Click and drag across any structure on the slide to
            create a normalized YOLO bounding box.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="drawSpeciesSelect" style={{ fontWeight: 700 }}>
              Assign Class:
            </label>
            <select
              id="drawSpeciesSelect"
              value={newBoxClassId}
              onChange={(e) => setNewBoxClassId(Number(e.target.value))}
              style={{ padding: '5px 8px', fontSize: 12 }}
            >
              <option value={-1}>⚡ Auto-Classify Drawn Box</option>
              {TARGET_PARASITES.map((p) => (
                <option key={p.classId} value={p.classId}>
                  [Class {p.classId}] {p.scientificName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Interactive Microscope Stage Container */}
      <div
        className="imagebox"
        style={{
          position: 'relative',
          overflow: 'auto',
          maxHeight: 500,
          cursor: drawMode ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
      >
        <div
          ref={stageRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorCoords(null)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{
            position: 'relative',
            display: 'inline-block',
            width: `${zoom * 100}%`,
            maxWidth: zoom === 1 ? '100%' : 'none',
            transition: 'width 0.15s ease',
          }}
        >
          <img
            src={originalDataUrl}
            alt="Microscopic specimen stage"
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              filter: `blur(${opticalBlur}px) brightness(${opticalBrightness}%) contrast(${opticalContrast}%)`,
            }}
          />

          {/* Interactive SVG Overlay for Clickable Bounding Boxes & Reticles */}
          {showAnnotatedOverlay && (
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: drawMode ? 'none' : 'auto',
              }}
            >
              {detections.map((d, idx) => {
                const [bx, by, bw, bh] = d.bbox;
                const x = bx * 1000;
                const y = by * 1000;
                const w = bw * 1000;
                const h = bh * 1000;
                const cx = x + w / 2;
                const cy = y + h / 2;
                const isSelected = selectedDetectionIndex === idx;
                const strokeColor = isSelected ? '#ffb703' : '#e00020';

                return (
                  <g
                    key={d.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDetection(isSelected ? null : idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Bounding box & elliptical reticle */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={isSelected ? 'rgba(255, 183, 3, 0.16)' : 'rgba(224, 0, 32, 0.06)'}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 6 : 4}
                      strokeDasharray={isSelected ? '14 6' : undefined}
                      rx={8}
                    />
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={Math.max(w / 2, 16)}
                      ry={Math.max(h / 2, 16)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 5 : 3.5}
                    />
                  </g>
                );
              })}

              {/* Active Dragging Box Preview */}
              {drawMode && dragStart && dragCurrent && (
                <rect
                  x={Math.min(dragStart.x, dragCurrent.x) * 1000}
                  y={Math.min(dragStart.y, dragCurrent.y) * 1000}
                  width={Math.abs(dragCurrent.x - dragStart.x) * 1000}
                  height={Math.abs(dragCurrent.y - dragStart.y) * 1000}
                  fill="rgba(142, 16, 24, 0.2)"
                  stroke="#8e1018"
                  strokeWidth={5}
                  strokeDasharray="10 5"
                />
              )}
            </svg>
          )}

          {/* HTML Badge Labels over each detection */}
          {showAnnotatedOverlay &&
            detections.map((d, idx) => {
              const [bx, by] = d.bbox;
              const isSelected = selectedDetectionIndex === idx;
              const confText =
                showConfidence && Number.isFinite(d.confidence)
                  ? ` ${((d.confidence as number) * 100).toFixed(1)}%`
                  : '';
              return (
                <button
                  key={`lbl-${d.id || idx}`}
                  type="button"
                  onClick={() => onSelectDetection(isSelected ? null : idx)}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(82, Math.max(1, bx * 100))}%`,
                    top: `${Math.max(1, by * 100 - 5.5)}%`,
                    background: isSelected ? '#9a5b00' : '#c9001c',
                    color: '#fff',
                    padding: '2px 7px',
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    border: isSelected ? '2px solid #ffd166' : '1px solid #fff',
                    whiteSpace: 'nowrap',
                    zIndex: isSelected ? 10 : 5,
                  }}
                >
                  #{idx + 1} {d.label}
                  {confText}
                </button>
              );
            })}
        </div>

        {/* Live Telemetry Coordinates HUD */}
        <div
          style={{
            position: 'sticky',
            bottom: 6,
            left: 6,
            marginLeft: 'auto',
            background: 'rgba(45, 5, 8, 0.82)',
            color: '#fff',
            padding: '4px 9px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          {cursorCoords
            ? `Stage XY: (${cursorCoords.normX.toFixed(3)}, ${cursorCoords.normY.toFixed(3)}) · Field: ${cursorCoords.umX} × ${cursorCoords.umY} μm · Zoom: ${Math.round(zoom * 100)}%`
            : `Interactive Stage · Click any candidate box to inspect or reclassify · Zoom: ${Math.round(zoom * 100)}%`}
        </div>
      </div>

      {/* Selected Detection Inspector Bar */}
      {selectedDet && selectedDetectionIndex !== null && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 280px' }}>
            <span className="badge" style={{ marginRight: 8 }}>
              Selected Candidate #{selectedDetectionIndex + 1}
            </span>
            <b style={{ fontSize: 13 }}>{selectedDet.label}</b>
            {selectedDet.group && (
              <span className="smallprint" style={{ marginLeft: 8, fontWeight: 700 }}>
                · Class {selectedDet.classId ?? 0} ({selectedDet.group}
                {selectedDet.stage ? ` · ${selectedDet.stage}` : ''})
              </span>
            )}
            <div className="smallprint" style={{ fontFamily: 'monospace', marginTop: 3 }}>
              YOLO Format: {selectedDet.yoloLine || '—'}
            </div>
            {selectedDet.morphologicalNote && (
              <div className="smallprint" style={{ marginTop: 4, color: 'var(--navy)' }}>
                <b>Auto-Annotated Morphology:</b> {selectedDet.morphologicalNote}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="reclassifySelect" style={{ fontSize: 12, fontWeight: 700 }}>
              Reclassify Species:
            </label>
            <select
              id="reclassifySelect"
              value={selectedDet.classId ?? 0}
              onChange={(e) => handleChangeSelectedSpecies(Number(e.target.value))}
              style={{ padding: '6px 9px', fontSize: 12 }}
            >
              {TARGET_PARASITES.map((p) => (
                <option key={p.classId} value={p.classId}>
                  [Class {p.classId}] {p.scientificName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="tinybtn danger"
              onClick={handleDeleteSelected}
            >
              Remove Box (FP)
            </button>
          </div>
        </div>
      )}

      {/* Objective 5 Interactive Condition Simulator Sliders */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
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
            marginBottom: 8,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <b style={{ fontSize: 12, color: 'var(--navy)' }}>
            Interactive Condition Simulator (Objective 5: Clarity & Illumination Stress Test)
          </b>
          <button
            type="button"
            className="tinybtn"
            onClick={() => onOpticalChange(0, 100, 100)}
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            Reset Optics
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            fontSize: 12,
          }}
        >
          <div>
            <label htmlFor="simBlur" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Defocus / Blur</span>
              <b>{opticalBlur.toFixed(1)} px</b>
            </label>
            <input
              id="simBlur"
              type="range"
              min={0}
              max={6}
              step={0.5}
              value={opticalBlur}
              onChange={(e) =>
                onOpticalChange(Number(e.target.value), opticalBrightness, opticalContrast)
              }
              style={{ width: '100%', accentColor: '#8e1018' }}
            />
          </div>
          <div>
            <label
              htmlFor="simBrightness"
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Illumination</span>
              <b>{opticalBrightness}%</b>
            </label>
            <input
              id="simBrightness"
              type="range"
              min={45}
              max={155}
              step={5}
              value={opticalBrightness}
              onChange={(e) =>
                onOpticalChange(opticalBlur, Number(e.target.value), opticalContrast)
              }
              style={{ width: '100%', accentColor: '#8e1018' }}
            />
          </div>
          <div>
            <label
              htmlFor="simContrast"
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Contrast</span>
              <b>{opticalContrast}%</b>
            </label>
            <input
              id="simContrast"
              type="range"
              min={50}
              max={150}
              step={5}
              value={opticalContrast}
              onChange={(e) =>
                onOpticalChange(opticalBlur, opticalBrightness, Number(e.target.value))
              }
              style={{ width: '100%', accentColor: '#8e1018' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
