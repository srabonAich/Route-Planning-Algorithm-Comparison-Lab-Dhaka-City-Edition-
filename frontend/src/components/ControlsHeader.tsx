import React from 'react';
import type { ConstraintItem, PresetItem, LocationItem } from '../types';
import {
  Sliders,
  RotateCcw,
  Play,
  MapPin,
  Flame,
  Shield,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

interface ControlsHeaderProps {
  sourceLocation: LocationItem | null;
  targetLocation: LocationItem | null;
  popularLocations: LocationItem[];
  sourceNameInput: string;
  targetNameInput: string;
  onChangeSourceName: (name: string) => void;
  onChangeTargetName: (name: string) => void;
  onSwapSourceTarget: () => void;
  presets: PresetItem[];
  onApplyPreset: (preset: PresetItem) => void;
  constraints: ConstraintItem[];
  onClearConstraints: () => void;
  onRemoveConstraint: (u: number, v: number) => void;
  weightedAWeight: number;
  onChangeWeight: (w: number) => void;
  onRecalculate: () => void;
  loading: boolean;
}

export const ControlsHeader: React.FC<ControlsHeaderProps> = ({
  sourceLocation,
  targetLocation,
  popularLocations,
  sourceNameInput,
  targetNameInput,
  onChangeSourceName,
  onChangeTargetName,
  onSwapSourceTarget,
  presets,
  onApplyPreset,
  constraints,
  onClearConstraints,
  onRemoveConstraint,
  weightedAWeight,
  onChangeWeight,
  onRecalculate,
  loading,
}) => {
  return (
    <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-20 shadow-xl space-y-4">
      {/* Top Bar: Title & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Route Planning & Algorithm Comparison Lab
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Dhaka Network • 25,270 Nodes
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Benchmarking BFS, UCS (Dijkstra), A*, and Weighted A* across real OpenStreetMap drive corridors in Dhaka
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {constraints.length > 0 && (
            <button
              onClick={onClearConstraints}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Constraints ({constraints.length})
            </button>
          )}

          <button
            onClick={onRecalculate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Solving...' : 'Calculate Routes'}
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Origin & Destination Selectors (Cols 1-6) */}
        <div className="lg:col-span-6 flex flex-col sm:flex-row items-center gap-2 p-2 rounded-xl bg-gray-950/70 border border-gray-800 text-xs">
          {/* Source Input */}
          <div className="w-full sm:flex-1 relative">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold text-gray-400">Origin (Source)</span>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                list="popular-sources"
                value={sourceNameInput}
                onChange={(e) => onChangeSourceName(e.target.value)}
                placeholder="e.g. Dhanmondi, Shahbagh..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition font-medium"
              />
              <datalist id="popular-sources">
                {popularLocations.map((loc) => (
                  <option key={`src-opt-${loc.key}`} value={loc.name}>
                    {loc.description}
                  </option>
                ))}
              </datalist>
            </div>
            {sourceLocation && (
              <span className="block text-[10px] text-gray-400 font-mono mt-0.5 px-1 truncate">
                Node #{sourceLocation.node_id} ({sourceLocation.lat.toFixed(4)}, {sourceLocation.lng.toFixed(4)})
              </span>
            )}
          </div>

          {/* Swap Direction Button */}
          <button
            onClick={onSwapSourceTarget}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition shrink-0 cursor-pointer"
            title="Swap Origin and Destination"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* Target Input */}
          <div className="w-full sm:flex-1 relative">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold text-gray-400">Destination (Target)</span>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                list="popular-targets"
                value={targetNameInput}
                onChange={(e) => onChangeTargetName(e.target.value)}
                placeholder="e.g. Mirpur 10, Gulshan..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition font-medium"
              />
              <datalist id="popular-targets">
                {popularLocations.map((loc) => (
                  <option key={`tgt-opt-${loc.key}`} value={loc.name}>
                    {loc.description}
                  </option>
                ))}
              </datalist>
            </div>
            {targetLocation && (
              <span className="block text-[10px] text-gray-400 font-mono mt-0.5 px-1 truncate">
                Node #{targetLocation.node_id} ({targetLocation.lat.toFixed(4)}, {targetLocation.lng.toFixed(4)})
              </span>
            )}
          </div>
        </div>

        {/* Dhaka Presets Selector (Cols 7-9) */}
        <div className="lg:col-span-3 flex items-center gap-2 p-2 rounded-xl bg-gray-950/70 border border-gray-800 text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
          <div className="w-full overflow-hidden">
            <span className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Dhaka Scenarios</span>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-0.5 scrollbar-thin">
              {presets.map((p) => (
                <button
                  key={`preset-${p.id}`}
                  onClick={() => onApplyPreset(p)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-900 border border-gray-800 hover:border-sky-500/50 hover:bg-sky-500/10 text-gray-300 hover:text-white transition whitespace-nowrap cursor-pointer"
                  title={p.description}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weighted A* Slider (Cols 10-12) */}
        <div className="lg:col-span-3 flex items-center gap-3 p-2 px-3 rounded-xl bg-gray-950/70 border border-gray-800 text-xs">
          <div className="shrink-0">
            <span className="block text-[9px] uppercase font-bold text-gray-400">Weighted A* (w)</span>
            <span className="font-mono font-bold text-sky-400">{weightedAWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={weightedAWeight}
            onChange={(e) => onChangeWeight(parseFloat(e.target.value))}
            className="w-full accent-sky-500 bg-gray-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Active Constraints Badges Bar */}
      {constraints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800/60">
          <span className="text-[10px] uppercase font-bold text-gray-400">Active Constraints:</span>
          {constraints.map((c, idx) => (
            <div
              key={`badge-${c.u}-${c.v}-${idx}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-gray-800/80 border border-gray-700 text-gray-300"
            >
              {c.blocked ? (
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  ⛔ Road #{c.u}→#{c.v} Closed
                </span>
              ) : c.traffic_factor > 1.0 ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3" /> #{c.u}→#{c.v} ({c.traffic_factor}x)
                </span>
              ) : (
                <span className="text-purple-400 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> #{c.u}→#{c.v} (+{c.safety_penalty}s)
                </span>
              )}
              <button
                onClick={() => onRemoveConstraint(c.u, c.v)}
                className="text-gray-400 hover:text-white ml-1 font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
