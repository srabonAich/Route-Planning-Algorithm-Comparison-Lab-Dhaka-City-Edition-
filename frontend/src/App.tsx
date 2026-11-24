import { useState, useEffect, useCallback } from 'react';
import type {
  GraphResponse,
  SegmentItem,
  ConstraintItem,
  CompareResponse,
  PresetItem,
  LocationItem,
  AlgorithmType,
} from './types';
import { MapContainer } from './components/MapContainer';
import { ConstraintModal } from './components/ConstraintModal';
import { ComparisonModal } from './components/ComparisonModal';
import { Sidebar } from './components/Sidebar';
import { RouteInspector } from './components/RouteInspector';
import { AlertCircle, Loader2 } from 'lucide-react';

export function App() {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [popularLocations, setPopularLocations] = useState<LocationItem[]>([]);
  const [sourceNameInput, setSourceNameInput] = useState<string>('Dhanmondi');
  const [targetNameInput, setTargetNameInput] = useState<string>('Mirpur 10');
  const [resolvedSource, setResolvedSource] = useState<LocationItem | null>(null);
  const [resolvedTarget, setResolvedTarget] = useState<LocationItem | null>(null);
  const [constraints, setConstraints] = useState<ConstraintItem[]>([]);
  const [weightedAWeight, setWeightedAWeight] = useState<number>(1.6);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('A*');
  const [selectedSegment, setSelectedSegment] = useState<SegmentItem | null>(null);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector & Modal visibility
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Animation Engine Triggers and State
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(25);
  const [visualizeTrigger, setVisualizeTrigger] = useState<number>(0);
  const [skipTrigger, setSkipTrigger] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [progressCount, setProgressCount] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Load graph metadata, presets, and locations on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [graphRes, presetsRes, locsRes] = await Promise.all([
          fetch('/api/graph'),
          fetch('/api/presets'),
          fetch('/api/locations'),
        ]);

        if (!graphRes.ok) throw new Error('Failed to load Dhaka road network');
        const gData: GraphResponse = await graphRes.json();
        setGraphData(gData);

        if (gData.default_source_name) setSourceNameInput(gData.default_source_name);
        if (gData.default_target_name) setTargetNameInput(gData.default_target_name);

        if (presetsRes.ok) {
          const pData = await presetsRes.json();
          setPresets(pData.presets || []);
        }

        if (locsRes.ok) {
          const lData = await locsRes.json();
          setPopularLocations(lData.locations || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Compute routes
  const computeRoute = useCallback(
    async (
      srcName: string,
      tgtName: string,
      cList: ConstraintItem[],
      w: number,
      triggerAnimationAfter: boolean = true
    ) => {
      if (!srcName.trim() || !tgtName.trim()) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/route/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_name: srcName.trim(),
            target_name: tgtName.trim(),
            constraints: cList,
            weighted_a_weight: w,
            active_algorithm: selectedAlgorithm,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || 'Routing calculation failed');
        }

        const data: CompareResponse = await res.json();
        setCompareData(data);
        if (data.resolved_source) setResolvedSource(data.resolved_source);
        if (data.resolved_target) setResolvedTarget(data.resolved_target);

        if (triggerAnimationAfter) {
          setIsPaused(false);
          setVisualizeTrigger((prev) => prev + 1);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error calculating routes');
      } finally {
        setLoading(false);
      }
    },
    [selectedAlgorithm]
  );

  // Trigger initial route computation once graph metadata loads
  useEffect(() => {
    if (graphData && sourceNameInput && targetNameInput && !compareData) {
      computeRoute(sourceNameInput, targetNameInput, constraints, weightedAWeight, true);
    }
  }, [graphData, constraints, weightedAWeight, computeRoute, compareData, sourceNameInput, targetNameInput]);

  // Active algorithm results
  const baselineResult = compareData?.baseline[selectedAlgorithm] || null;
  const constrainedResult = compareData?.constrained[selectedAlgorithm] || null;
  const activeResult = constraints.length > 0 ? constrainedResult : baselineResult;
  const visitedSequence = activeResult?.visited_node_sequence || [];

  // When selected algorithm changes
  const handleSelectAlgorithm = (alg: AlgorithmType) => {
    setSelectedAlgorithm(alg);
    setIsPaused(false);
    setVisualizeTrigger((prev) => prev + 1);
  };

  // Visualize Button clicked
  const handleVisualize = () => {
    setIsPaused(false);
    setVisualizeTrigger((prev) => prev + 1);
  };

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Skip to End (reveals final route immediately)
  const handleSkipToEnd = () => {
    setSkipTrigger((prev) => prev + 1);
  };

  // Reset animation
  const handleResetAnimation = () => {
    setIsPaused(false);
    setResetTrigger((prev) => prev + 1);
  };

  // Swap Direction
  const handleSwapDirection = () => {
    const tempSrc = sourceNameInput;
    const tempTgt = targetNameInput;
    setSourceNameInput(tempTgt);
    setTargetNameInput(tempSrc);
    computeRoute(tempTgt, tempSrc, constraints, weightedAWeight, true);
  };

  // Constraint handlers
  const handleSaveConstraint = (constraint: ConstraintItem) => {
    const newConstraints = [
      ...constraints.filter((c) => !(c.u === constraint.u && c.v === constraint.v)),
      constraint,
    ];
    setConstraints(newConstraints);
    computeRoute(sourceNameInput, targetNameInput, newConstraints, weightedAWeight, true);
  };

  const handleRemoveConstraint = (u: number, v: number) => {
    const newConstraints = constraints.filter((c) => !(c.u === u && c.v === v));
    setConstraints(newConstraints);
    computeRoute(sourceNameInput, targetNameInput, newConstraints, weightedAWeight, true);
  };

  const handleApplyPreset = (preset: PresetItem) => {
    setConstraints(preset.constraints);
    computeRoute(sourceNameInput, targetNameInput, preset.constraints, weightedAWeight, true);
  };

  const handleClearConstraints = () => {
    setConstraints([]);
    computeRoute(sourceNameInput, targetNameInput, [], weightedAWeight, true);
  };

  // 1-click toggle block from inspector
  const handleQuickToggleBlock = (segment: SegmentItem) => {
    const exists = constraints.find(
      (c) => (c.u === segment.u && c.v === segment.v) || (c.u === segment.v && c.v === segment.u)
    );
    let updated: ConstraintItem[];
    if (exists) {
      updated = constraints.filter(
        (c) => !(c.u === segment.u && c.v === segment.v) && !(c.u === segment.v && c.v === segment.u)
      );
    } else {
      updated = [
        ...constraints,
        {
          u: segment.u,
          v: segment.v,
          blocked: true,
          traffic_factor: 1.0,
          safety_penalty: 0.0,
          bidirectional: true,
          constraint_type: 'roadblock',
        },
      ];
    }
    setConstraints(updated);
    computeRoute(sourceNameInput, targetNameInput, updated, weightedAWeight, true);
  };

  if (loading && !graphData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
        <h2 className="text-lg font-semibold tracking-wide">
          Loading Dhaka City OpenStreetMap Road Graph...
        </h2>
        <p className="text-xs text-gray-400">
          Extracting strongly connected urban drive corridors (25,000+ intersections)
        </p>
      </div>
    );
  }

  const center: [number, number] = graphData?.bbox
    ? [graphData.bbox.center_lat, graphData.bbox.center_lng]
    : [23.78, 90.4];

  const currentConstraintForSelectedSegment = selectedSegment
    ? constraints.find(
        (c) =>
          (c.u === selectedSegment.u && c.v === selectedSegment.v) ||
          (c.bidirectional && c.u === selectedSegment.v && c.v === selectedSegment.u)
      ) || null
    : null;

  const activeSegments =
    constrainedResult && constrainedResult.segments && constrainedResult.segments.length > 0
      ? constrainedResult.segments
      : baselineResult?.segments || [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950 font-sans">
      {/* 1. Full-Screen Interactive Leaflet Map Layer */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          sourceLocation={resolvedSource}
          targetLocation={resolvedTarget}
          selectedAlgorithm={selectedAlgorithm}
          visitedSequence={visitedSequence}
          resultPath={baselineResult?.coordinates || []}
          detourPath={constraints.length > 0 && constrainedResult ? constrainedResult.coordinates : undefined}
          constraints={constraints}
          constrainedSegments={activeSegments}
          center={center}
          animationSpeed={animationSpeed}
          isPaused={isPaused}
          visualizeTrigger={visualizeTrigger}
          skipTrigger={skipTrigger}
          resetTrigger={resetTrigger}
          onSelectSegment={(seg) => setSelectedSegment(seg)}
          onProgress={(curr, total) => setProgressCount({ current: curr, total })}
          onStatusChange={(animating) => setIsAnimating(animating)}
        />
      </div>

      {/* 2. Floating Collapsible GIS Control Sidebar */}
      <div className="absolute top-0 left-0 bottom-0 z-20 pointer-events-none p-3 flex">
        <Sidebar
          sourceName={sourceNameInput}
          targetName={targetNameInput}
          popularLocations={popularLocations}
          onChangeSource={setSourceNameInput}
          onChangeTarget={setTargetNameInput}
          onSwapDirection={handleSwapDirection}
          selectedAlgorithm={selectedAlgorithm}
          onSelectAlgorithm={handleSelectAlgorithm}
          weightedAWeight={weightedAWeight}
          onChangeWeight={setWeightedAWeight}
          onVisualize={handleVisualize}
          onRunAllCompare={() => setIsCompareModalOpen(true)}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
          isInspectorOpen={isInspectorOpen}
          isAnimating={isAnimating}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onSkipToEnd={handleSkipToEnd}
          onResetAnimation={handleResetAnimation}
          animationIndex={progressCount.current}
          totalVisitedCount={progressCount.total || visitedSequence.length}
          animationSpeed={animationSpeed}
          onChangeSpeed={setAnimationSpeed}
          activeResult={activeResult}
          baselineResult={baselineResult}
          loading={loading}
          presets={presets}
          constraints={constraints}
          onApplyPreset={handleApplyPreset}
          onRemoveConstraint={handleRemoveConstraint}
          onClearConstraints={handleClearConstraints}
        />
      </div>

      {/* 3. Bottom Expandable Route Inspector Drawer */}
      {isInspectorOpen && (
        <div className="absolute bottom-4 left-4 right-4 md:left-[430px] z-30 pointer-events-auto animate-in slide-in-from-bottom duration-200">
          <RouteInspector
            segments={activeSegments}
            constraints={constraints}
            selectedAlgorithm={selectedAlgorithm}
            onSelectSegment={(seg) => setSelectedSegment(seg)}
            onQuickToggleBlock={handleQuickToggleBlock}
          />
        </div>
      )}

      {/* Error Floating Toast */}
      {error && (
        <div className="absolute top-4 right-4 md:right-80 z-50 p-3 bg-red-950/90 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-red-200 text-xs shadow-2xl backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Constraint Editing Modal */}
      {selectedSegment && (
        <ConstraintModal
          segment={selectedSegment}
          currentConstraint={currentConstraintForSelectedSegment}
          onSave={handleSaveConstraint}
          onRemove={handleRemoveConstraint}
          onClose={() => setSelectedSegment(null)}
        />
      )}

      {/* Comprehensive All-Algorithm Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        summary={compareData?.summary || null}
        baselineResults={compareData?.baseline || null}
        constrainedResults={compareData?.constrained || null}
        onSelectAlgorithm={(alg) => handleSelectAlgorithm(alg as AlgorithmType)}
      />
    </div>
  );
}

export default App;
