import React from 'react';
import type { ComparativeSummary, AlgorithmResult } from '../types';
import { ALGORITHM_METAS } from '../types';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Brain, 
  Zap, 
  Compass, 
  BarChart2, 
  Layers 
} from 'lucide-react';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ComparativeSummary | null;
  baselineResults?: Record<string, AlgorithmResult> | null;
  constrainedResults?: Record<string, AlgorithmResult> | null;
  onSelectAlgorithm: (alg: string) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSelectAlgorithm,
}) => {
  if (!isOpen || !summary) return null;

  const maxNodes = Math.max(
    ...summary.table.map((r) => Math.max(r.baseline_nodes, r.constrained_nodes)),
    1
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/90">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Compass className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                All-Algorithm Benchmark & Telemetry Lab
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-normal">
                  8 Search Algorithms
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Empirical evaluation on Dhaka City road network (25,270 nodes & 62,634 directed edges)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Quantitative Benchmark Table */}
          <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/50">
            <div className="px-4 py-3 bg-gray-800/40 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Comprehensive Routing Metrics
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Optimal Cost Baseline: {summary.optimal_baseline_cost}s &bull; Detour: {summary.optimal_constrained_cost}s
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/90 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Algorithm</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Base Cost</th>
                    <th className="py-3 px-3 text-right">Detour Cost</th>
                    <th className="py-3 px-3 text-right">Base Nodes</th>
                    <th className="py-3 px-3 text-right">Detour Nodes</th>
                    <th className="py-3 px-3 text-right">Hops</th>
                    <th className="py-3 px-3 text-right">Time</th>
                    <th className="py-3 px-4 text-center">Optimality</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {summary.table.map((row) => {
                    const meta = (ALGORITHM_METAS as any)[row.algorithm];
                    const isOptimal = row.is_optimal;
                    const isFewest = row.algorithm === summary.fewest_nodes_expanded_alg;

                    return (
                      <tr
                        key={`modal-table-${row.algorithm}`}
                        className="hover:bg-gray-800/30 transition text-gray-300"
                      >
                        <td className="py-3 px-4 font-sans font-semibold text-white flex items-center gap-2">
                          <span>{row.algorithm}</span>
                          {isFewest && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                              Fastest
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta?.badgeColor || 'border-gray-700'}`}>
                            {meta?.category || 'Search'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={isOptimal ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                            {row.baseline_cost}s
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={isOptimal ? 'text-sky-400 font-bold' : 'text-amber-300'}>
                            {row.constrained_cost > 0 ? `${row.constrained_cost}s` : 'Blocked'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-gray-400">
                          {row.baseline_nodes.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-400">
                          {row.constrained_nodes.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-300">
                          {row.constrained_hops}
                        </td>
                        <td className="py-3 px-3 text-right text-sky-300">
                          {row.total_runtime_ms} ms
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          {isOptimal ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Optimal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" /> Suboptimal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <button
                            onClick={() => {
                              onSelectAlgorithm(row.algorithm);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-sky-600 text-gray-200 hover:text-white rounded-lg transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Visual State-Space Exploration Bar Chart */}
          <div className="border border-gray-800 rounded-xl p-4 bg-gray-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                State Space Exploration Efficiency (Nodes Expanded)
              </span>
              <span className="text-xs text-gray-400">Fewer nodes = faster search</span>
            </div>

            <div className="space-y-2 pt-2">
              {summary.table.map((row) => {
                const pct = Math.max(4, Math.round((row.constrained_nodes / maxNodes) * 100));
                return (
                  <div key={`chart-row-${row.algorithm}`} className="flex items-center gap-3 text-xs">
                    <span className="w-28 font-medium text-gray-300 text-right truncate">
                      {row.algorithm}
                    </span>
                    <div className="flex-1 bg-gray-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-gray-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          row.is_optimal ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 font-mono text-gray-300 text-right">
                      {row.constrained_nodes.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Deep AI Theoretical Insights */}
          <div className="border border-gray-800 rounded-xl p-4 bg-gray-950/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <Brain className="w-4 h-4 text-purple-400" />
              Algorithmic Telemetry & AI Search Insights
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {summary.insights.map((insight, idx) => (
                <div
                  key={`modal-insight-${idx}`}
                  className="p-3 rounded-xl bg-gray-800/30 border border-gray-800 text-xs text-gray-300 leading-relaxed flex items-start gap-2.5"
                >
                  <span className="p-1 rounded bg-purple-500/10 text-purple-400 mt-0.5 shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition"
          >
            Close Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
