import React, { useState } from 'react';
import type { 
  AlgorithmType, 
  LocationItem, 
  ConstraintItem, 
  AlgorithmResult, 
  PresetItem 
} from '../types';
import { ALGORITHM_METAS } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Layers, 
  Navigation, 
  AlertTriangle, 
  Clock, 
  Gauge, 
  Sparkles, 
  ArrowUpDown, 
  X, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Flame,
  HardHat,
  Ban,
  Car
} from 'lucide-react';

interface SidebarProps {
  // Navigation & Locations
  sourceName: string;
  targetName: string;
  popularLocations: LocationItem[];
  onChangeSource: (val: string) => void;
  onChangeTarget: (val: string) => void;
  onSwapDirection: () => void;
  
  // Algorithm selection
  selectedAlgorithm: AlgorithmType;
  onSelectAlgorithm: (alg: AlgorithmType) => void;
  weightedAWeight: number;
  onChangeWeight: (w: number) => void;

  // Actions
  onVisualize: () => void;
  onRunAllCompare: () => void;
  onToggleInspector: () => void;
  isInspectorOpen: boolean;

  // Animation Engine state
  isAnimating: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onSkipToEnd: () => void;
  onResetAnimation: () => void;
  animationIndex: number;
  totalVisitedCount: number;
  animationSpeed: number;
  onChangeSpeed: (spd: number) => void;

  // Active metrics
  activeResult: AlgorithmResult | null;
  baselineResult: AlgorithmResult | null;
  loading: boolean;

  // Constraints & Presets
  presets: PresetItem[];
  constraints: ConstraintItem[];
  onApplyPreset: (preset: PresetItem) => void;
  onRemoveConstraint: (u: number, v: number) => void;
  onClearConstraints: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sourceName,
  targetName,
  popularLocations,
  onChangeSource,
  onChangeTarget,
  onSwapDirection,
  selectedAlgorithm,
  onSelectAlgorithm,
  weightedAWeight,
  onChangeWeight,
  onVisualize,
  onRunAllCompare,
  onToggleInspector,
  isInspectorOpen,
  isAnimating,
  isPaused,
  onTogglePause,
  onSkipToEnd,
  onResetAnimation,
  animationIndex,
  totalVisitedCount,
  animationSpeed,
  onChangeSpeed,
  activeResult,
  baselineResult,
  loading,
  presets,
  constraints,
  onApplyPreset,
  onRemoveConstraint,
  onClearConstraints,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const meta = ALGORITHM_METAS[selectedAlgorithm];

  const formatSeconds = (sec: number) => {
    if (!isFinite(sec) || sec <= 0) return '0s';
    const mins = Math.floor(sec / 60);
    const remSec = Math.round(sec % 60);
    return mins > 0 ? `${mins}m ${remSec}s` : `${sec.toFixed(1)}s`;
  };

  const getConstraintIcon = (type?: string, blocked?: boolean) => {
    if (blocked || type === 'roadblock') return <Ban className="w-3 h-3 text-red-400" />;
    if (type === 'fire') return <Flame className="w-3 h-3 text-orange-400" />;
    if (type === 'construction') return <HardHat className="w-3 h-3 text-yellow-400" />;
    if (type === 'late_night_risk') return <ShieldAlert className="w-3 h-3 text-purple-400" />;
    return <Car className="w-3 h-3 text-amber-400" />;
  };

  return (
    <aside
      className={`relative z-[500] h-full transition-all duration-300 flex flex-col pointer-events-auto ${
        collapsed ? 'w-12' : 'w-96 xl:w-[410px]'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-6 z-50 p-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:text-white shadow-xl hover:bg-gray-700 transition"
        title={collapsed ? 'Expand Dashboard' : 'Collapse Dashboard'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Sidebar Shell */}
      <div
        className={`w-full h-full bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 shadow-2xl flex flex-col overflow-hidden ${
          collapsed ? 'hidden' : 'flex'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/90">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/20">
              <Navigation className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Dhaka Route Lab
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono font-medium">
                  v2.5
                </span>
              </h1>
              <p className="text-[11px] text-gray-400">OSM 25k Nodes &bull; Global Rerouting</p>
            </div>
          </div>
          <button
            onClick={onToggleInspector}
            className={`px-2.5 py-1 text-xs rounded-lg border transition font-medium flex items-center gap-1.5 ${
              isInspectorOpen
                ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                : 'bg-gray-800/80 border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inspector</span>
          </button>
        </div>

        {/* Scrollable Controls Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* 1. Location Selectors */}
          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Origin & Destination
              </span>
              <button
                type="button"
                onClick={onSwapDirection}
                className="p-1 rounded-md text-gray-400 hover:text-sky-400 hover:bg-gray-800 transition"
                title="Swap Direction"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Source */}
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs">🟢</span>
              <input
                type="text"
                list="dhaka-locations-src"
                value={sourceName}
                onChange={(e) => onChangeSource(e.target.value)}
                placeholder="Origin Hub (e.g. Dhanmondi)"
                className="w-full bg-gray-900 border border-gray-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-medium"
              />
              <datalist id="dhaka-locations-src">
                {popularLocations.map((loc) => (
                  <option key={`src-${loc.key}`} value={loc.name}>
                    {loc.description}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Target */}
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs">🔴</span>
              <input
                type="text"
                list="dhaka-locations-tgt"
                value={targetName}
                onChange={(e) => onChangeTarget(e.target.value)}
                placeholder="Destination Hub (e.g. Mirpur 10)"
                className="w-full bg-gray-900 border border-gray-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-medium"
              />
              <datalist id="dhaka-locations-tgt">
                {popularLocations.map((loc) => (
                  <option key={`tgt-${loc.key}`} value={loc.name}>
                    {loc.description}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* 2. Algorithm Selector & Dynamic Info Card */}
          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Algorithm Strategy
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                {meta.category}
              </span>
            </div>

            <select
              value={selectedAlgorithm}
              onChange={(e) => onSelectAlgorithm(e.target.value as AlgorithmType)}
              className="w-full bg-gray-900 border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <optgroup label="Informed / Heuristic Search">
                <option value="A*">A* Search (Admissible Haversine - Optimal)</option>
                <option value="Weighted A*">Weighted A* (Heuristic Inflated w=1.6)</option>
                <option value="GBFS">Greedy Best-First Search (h(n) Only)</option>
              </optgroup>
              <optgroup label="Uninformed Search">
                <option value="UCS">Uniform Cost Search / Dijkstra (Cost-Optimal)</option>
                <option value="BFS">Breadth-First Search (Hop-Optimal)</option>
                <option value="DFS">Depth-First Search (Cycle-Checked)</option>
                <option value="DLS">Depth-Limited Search (Depth=120)</option>
                <option value="IDS">Iterative Deepening Search (IDS)</option>
              </optgroup>
            </select>

            {/* Algorithm Info Card */}
            <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Optimality:</span>
                <span className="font-semibold text-emerald-400">{meta.optimality}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Heuristic / Rule:</span>
                <span className="font-mono text-sky-300 text-[10px]">{meta.heuristic}</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-snug pt-0.5 border-t border-gray-800">
                {meta.description}
              </p>
            </div>

            {/* Weighted A* Weight Slider if selected */}
            {selectedAlgorithm === 'Weighted A*' && (
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-300 font-medium">Heuristic Inflation (w)</span>
                  <span className="font-mono font-bold text-blue-400">{weightedAWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.2"
                  value={weightedAWeight}
                  onChange={(e) => onChangeWeight(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 bg-gray-700 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* 3. Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onVisualize}
              disabled={loading}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl transition disabled:opacity-50 ${
                isAnimating
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 animate-pulse'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/30'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAnimating ? 'Searching...' : 'Visualize Route'}</span>
            </button>
            <button
              onClick={onRunAllCompare}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 transition disabled:opacity-50"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Run All & Compare</span>
            </button>
          </div>

          {/* 4. Animation Player Controls (Visible during/after animation) */}
          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Search Animation Player
              </span>
              <span className="font-mono text-[11px] text-amber-400 font-semibold">
                {totalVisitedCount > 0 ? `${Math.round((animationIndex / totalVisitedCount) * 100)}%` : '0%'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700/60">
              <div
                className="bg-gradient-to-r from-amber-500 to-sky-500 h-full transition-all duration-100"
                style={{
                  width: totalVisitedCount > 0 ? `${Math.min(100, (animationIndex / totalVisitedCount) * 100)}%` : '0%',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>Explored: {animationIndex.toLocaleString()}</span>
              <span>Total Visited: {totalVisitedCount.toLocaleString()}</span>
            </div>

            {/* Player Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={onResetAnimation}
                title="Restart Animation"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onTogglePause}
                title={isPaused ? 'Resume Animation' : 'Pause Animation'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/30 transition"
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={onSkipToEnd}
                title="Skip to End (Reveal Path)"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Slider */}
            <div className="space-y-1 pt-1 border-t border-gray-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Animation Speed:</span>
                <span className="font-mono font-bold text-amber-400">
                  {animationSpeed}x ({Math.max(1, Math.round(200 / animationSpeed))}ms delay)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={animationSpeed}
                onChange={(e) => onChangeSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-gray-700 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                <span>1x (200ms pause)</span>
                <span>50x (10ms pause)</span>
                <span>100x (1ms rapid)</span>
              </div>
            </div>
          </div>

          {/* 5. Prominently Displayed Real-Time Telemetry Card */}
          {activeResult && (
            <div className="bg-gray-950/80 border border-gray-800/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Telemetry Metrics
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    activeResult.success
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {activeResult.success ? 'Route Discovered' : 'Trapped / Severed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total Travel Cost</span>
                  <p className="text-sm font-bold text-sky-400 font-mono">
                    {formatSeconds(activeResult.total_cost)}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono">({activeResult.total_cost}s)</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Nodes Explored</span>
                  <p className="text-sm font-bold text-amber-400 font-mono">
                    {activeResult.nodes_expanded.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {baselineResult ? `${Math.round((activeResult.nodes_expanded / Math.max(1, baselineResult.nodes_expanded)) * 100)}% of base` : 'evaluated'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Intersections (Hops)</span>
                  <p className="text-sm font-bold text-emerald-400 font-mono">
                    {activeResult.path.length} hops
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Execution Time</span>
                  <p className="text-sm font-bold text-purple-400 font-mono">
                    {activeResult.execution_time_ms} ms
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Scenario Presets & Constraints */}
          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Dhaka Scenario Presets
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-left transition group"
                >
                  <div className="text-[11px] font-semibold text-gray-200 group-hover:text-white truncate">
                    {preset.name}
                  </div>
                  <div className="text-[9px] text-gray-400 line-clamp-1 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Active Constraints summary list */}
            {constraints.length > 0 && (
              <div className="pt-2 border-t border-gray-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">Active Constraints ({constraints.length}):</span>
                  <button
                    onClick={onClearConstraints}
                    className="text-red-400 hover:text-red-300 text-[10px] font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {constraints.map((c, i) => (
                    <div
                      key={`constraint-chip-${c.u}-${c.v}-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 border border-gray-700 text-[10px] text-gray-300"
                    >
                      {getConstraintIcon(c.constraint_type, c.blocked)}
                      <span>
                        {c.blocked ? 'Blocked' : c.traffic_factor > 1 ? `${c.traffic_factor}x` : `+${c.safety_penalty}s`}
                      </span>
                      <button
                        onClick={() => onRemoveConstraint(c.u, c.v)}
                        className="ml-1 text-gray-400 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
