import React, { useState } from 'react';
import type { SegmentItem, ConstraintItem } from '../types';
import { Route, Search, Ban, SlidersHorizontal, ArrowRight } from 'lucide-react';

interface RouteInspectorProps {
  segments: SegmentItem[];
  constraints: ConstraintItem[];
  selectedAlgorithm: string;
  onSelectSegment: (segment: SegmentItem) => void;
  onQuickToggleBlock: (segment: SegmentItem) => void;
}

export const RouteInspector: React.FC<RouteInspectorProps> = ({
  segments,
  constraints,
  selectedAlgorithm,
  onSelectSegment,
  onQuickToggleBlock,
}) => {
  const [filterText, setFilterText] = useState('');

  if (!segments || segments.length === 0) {
    return (
      <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-2xl text-center text-xs text-gray-400">
        No active route calculated yet. Select an Origin and Destination to inspect path corridors.
      </div>
    );
  }

  const constraintMap = new Map<string, ConstraintItem>();
  constraints.forEach((c) => {
    constraintMap.set(`${c.u}-${c.v}`, c);
    if (c.bidirectional) {
      constraintMap.set(`${c.v}-${c.u}`, c);
    }
  });

  const totalMeters = segments.reduce((acc, s) => acc + s.length, 0);
  const totalKm = (totalMeters / 1000).toFixed(1);

  const filteredSegments = segments.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.u.toString().includes(q) ||
      s.v.toString().includes(q)
    );
  });

  return (
    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl overflow-hidden p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Route className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              Route Corridors & Path Inspector
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono">
                {selectedAlgorithm} • {segments.length} Segments ({totalKm} km)
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Click any road segment along the route to inspect speed, apply traffic jams, or block it.
            </p>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search road name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Horizontal Carousel of Segments */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        {filteredSegments.map((seg, idx) => {
          const c = constraintMap.get(`${seg.u}-${seg.v}`);
          const isBlocked = c ? c.blocked : seg.blocked;
          const isTraffic = c ? !c.blocked && c.traffic_factor > 1.2 : false;
          const isSafety = c ? !c.blocked && c.safety_penalty > 0 : false;

          return (
            <div
              key={`seg-card-${seg.u}-${seg.v}-${idx}`}
              className={`shrink-0 w-64 p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                isBlocked
                  ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10'
                  : isTraffic
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : isSafety
                  ? 'bg-purple-500/10 border-purple-500/40'
                  : 'bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] text-gray-400 font-mono">
                    #{idx + 1} • {seg.length}m
                  </span>
                  {isBlocked ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">
                      Blocked
                    </span>
                  ) : isTraffic ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                      {c?.traffic_factor}x Jam
                    </span>
                  ) : isSafety ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                      +{c?.safety_penalty}s Risk
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      {seg.cost}s
                    </span>
                  )}
                </div>

                <div className="font-semibold text-white truncate text-xs mb-1" title={seg.name}>
                  {seg.name}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                  <span>{seg.speed_kph} km/h</span>
                  <span>•</span>
                  <span className="truncate">{seg.u} <ArrowRight className="w-2.5 h-2.5 inline" /> {seg.v}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-800/80">
                <button
                  onClick={() => onSelectSegment(seg)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-gray-700/60 hover:bg-sky-600 hover:text-white text-gray-300 text-[11px] font-medium transition"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Configure
                </button>
                <button
                  onClick={() => onQuickToggleBlock(seg)}
                  className={`p-1 rounded-lg border transition ${
                    isBlocked
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                  }`}
                  title={isBlocked ? 'Unblock road' : 'Quickly block road'}
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
