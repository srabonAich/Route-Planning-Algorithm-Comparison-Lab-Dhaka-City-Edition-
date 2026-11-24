import React from 'react';
import type { ComparativeSummary, AlgorithmResult } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  Brain,
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MetricsDashboardProps {
  summary: ComparativeSummary | null;
  baselineResults: Record<string, AlgorithmResult> | null;
  constrainedResults: Record<string, AlgorithmResult> | null;
  selectedAlgorithm: string;
  onSelectAlgorithm: (alg: string) => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  summary,
  baselineResults,
  constrainedResults,
  selectedAlgorithm,
  onSelectAlgorithm,
}) => {
  if (!summary || !baselineResults || !constrainedResults) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
        <p className="text-sm">Calculating algorithm routes and telemetry...</p>
      </div>
    );
  }

  const algorithms = ['BFS', 'UCS', 'A*', 'Weighted A*'];
  const maxNodes = Math.max(
    ...summary.table.map((r) => Math.max(r.baseline_nodes, r.constrained_nodes)),
    1
  );

  return (
    <div className="space-y-6">
      {/* Algorithm View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/80 p-2 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 px-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Active Route View:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {algorithms.map((alg) => {
            const isSelected = selectedAlgorithm === alg;
            const res = constrainedResults[alg];
            const isOptimal = summary.table.find((r) => r.algorithm === alg)?.is_optimal;

            return (
              <button
                key={`alg-tab-${alg}`}
                onClick={() => onSelectAlgorithm(alg)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{alg}</span>
                {isOptimal && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Guaranteed Optimal" />
                )}
                {res && (
                  <span className="font-mono text-[10px] opacity-75">
                    ({res.total_cost}s)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Side-by-Side Comparative Telemetry Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white text-sm">
              Algorithm Comparison & Reroute Telemetry
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Optimal Cost: {summary.optimal_constrained_cost}s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Algorithm</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Baseline Cost</th>
                <th className="py-3 px-3">Detour Cost</th>
                <th className="py-3 px-3">Delta Cost</th>
                <th className="py-3 px-3">Baseline Nodes</th>
                <th className="py-3 px-3">Detour Nodes</th>
                <th className="py-3 px-3">Total Runtime</th>
                <th className="py-3 px-4 text-center">Optimality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {summary.table.map((row) => {
                const isSelected = selectedAlgorithm === row.algorithm;
                const costDelta = Math.round((row.constrained_cost - row.baseline_cost) * 10) / 10;
                const algType =
                  row.algorithm === 'BFS'
                    ? 'Uninformed (Hops)'
                    : row.algorithm === 'UCS'
                    ? 'Uninformed (Weights)'
                    : row.algorithm === 'A*'
                    ? 'Informed (Admissible h)'
                    : 'Informed (Inflated h)';

                return (
                  <tr
                    key={`row-${row.algorithm}`}
                    onClick={() => onSelectAlgorithm(row.algorithm)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-sky-500/10 hover:bg-sky-500/15'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-semibold text-white flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-sky-400' : 'bg-transparent'
                        }`}
                      />
                      {row.algorithm}
                    </td>
                    <td className="py-3 px-3 text-gray-400 font-sans text-[11px]">{algType}</td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">{row.baseline_cost}s</td>
                    <td className="py-3 px-3 text-sky-400 font-semibold">
                      {row.success ? `${row.constrained_cost}s` : 'Unreachable'}
                    </td>
                    <td className="py-3 px-3">
                      {row.success ? (
                        <span
                          className={`font-semibold ${
                            costDelta > 0
                              ? 'text-amber-400'
                              : costDelta < 0
                              ? 'text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {costDelta > 0 ? `+${costDelta}s` : `${costDelta}s`}
                        </span>
                      ) : (
                        <span className="text-red-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-300">{row.baseline_nodes}</td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {row.constrained_nodes}
                      {row.algorithm === summary.fewest_nodes_expanded_alg && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-sky-500/20 text-sky-300 uppercase font-sans">
                          Fewest
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-400">{row.total_runtime_ms} ms</td>
                    <td className="py-3 px-4 text-center font-sans">
                      {row.is_optimal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Optimal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Sub-optimal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Visual Exploration Telemetry: Nodes Expanded Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nodes Expanded Chart */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                State Space Pruning (Nodes Expanded in Detour)
              </h4>
            </div>
            <span className="text-[10px] text-gray-400">Fewer is more efficient</span>
          </div>

          <div className="space-y-3 pt-1">
            {summary.table.map((row) => {
              const pct = Math.round((row.constrained_nodes / maxNodes) * 100);
              const isBest = row.algorithm === summary.fewest_nodes_expanded_alg;

              return (
                <div key={`chart-nodes-${row.algorithm}`} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-300">{row.algorithm}</span>
                    <span className="font-mono text-gray-400">
                      {row.constrained_nodes} nodes ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isBest
                          ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                          : row.algorithm === 'BFS'
                          ? 'bg-rose-500'
                          : row.algorithm === 'UCS'
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Path Cost & Hop Count Comparison */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Cost & Hop Count Trade-off
              </h4>
            </div>
            <span className="text-[10px] text-gray-400">Baseline vs Constrained</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {summary.table.map((row) => (
              <div
                key={`cost-card-${row.algorithm}`}
                className="p-2.5 rounded-xl bg-gray-800/40 border border-gray-800"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-200">{row.algorithm}</span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {row.constrained_hops} hops
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-400">{row.baseline_cost}s</span>
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                  <span className="font-bold text-sky-400">{row.constrained_cost}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Real-Time Theoretical Insight Log */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white text-sm">
            AI Algorithm Analysis & Real-Time Insights
          </h3>
        </div>

        <div className="space-y-2 pt-1">
          {summary.insights.map((insight, idx) => (
            <div
              key={`insight-${idx}`}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/30 border border-gray-800 text-xs text-gray-300 leading-relaxed"
            >
              <span className="mt-0.5 p-1 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0">
                <Brain className="w-3.5 h-3.5" />
              </span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
