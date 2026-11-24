import React, { useState, useEffect } from 'react';
import type { SegmentItem, ConstraintItem } from '../types';
import { 
  AlertTriangle, 
  Ban, 
  Car, 
  ShieldAlert, 
  X, 
  Check, 
  Trash2, 
  Flame, 
  HardHat, 
  AlertOctagon, 
  Moon,
  Sliders
} from 'lucide-react';

interface ConstraintModalProps {
  segment: SegmentItem | null;
  currentConstraint: ConstraintItem | null;
  onSave: (constraint: ConstraintItem) => void;
  onRemove: (u: number, v: number) => void;
  onClose: () => void;
}

export const ConstraintModal: React.FC<ConstraintModalProps> = ({
  segment,
  currentConstraint,
  onSave,
  onRemove,
  onClose,
}) => {
  if (!segment) return null;

  const [constraintType, setConstraintType] = useState<string>('custom');
  const [blocked, setBlocked] = useState<boolean>(false);
  const [trafficFactor, setTrafficFactor] = useState<number>(1.0);
  const [safetyPenalty, setSafetyPenalty] = useState<number>(0.0);
  const [affectNeighbors, setAffectNeighbors] = useState<boolean>(false);
  const [bidirectional, setBidirectional] = useState<boolean>(true);

  useEffect(() => {
    if (currentConstraint) {
      setConstraintType(currentConstraint.constraint_type || 'custom');
      setBlocked(currentConstraint.blocked);
      setTrafficFactor(currentConstraint.traffic_factor);
      setSafetyPenalty(currentConstraint.safety_penalty);
      setAffectNeighbors(currentConstraint.affect_neighbors ?? false);
      setBidirectional(currentConstraint.bidirectional ?? true);
    } else {
      setConstraintType('custom');
      setBlocked(segment.blocked);
      setTrafficFactor(segment.traffic_factor || 1.0);
      setSafetyPenalty(segment.safety_penalty || 0.0);
      setAffectNeighbors(false);
      setBidirectional(true);
    }
  }, [segment, currentConstraint]);

  const applyPreset = (type: string) => {
    setConstraintType(type);
    switch (type) {
      case 'roadblock':
        setBlocked(true);
        setTrafficFactor(1.0);
        setSafetyPenalty(0.0);
        setAffectNeighbors(false);
        break;
      case 'traffic_jam':
        setBlocked(false);
        setTrafficFactor(3.0);
        setSafetyPenalty(0.0);
        setAffectNeighbors(false);
        break;
      case 'construction':
        setBlocked(false);
        setTrafficFactor(2.0);
        setSafetyPenalty(10.0);
        setAffectNeighbors(false);
        break;
      case 'fire':
        setBlocked(true);
        setTrafficFactor(1.0);
        setSafetyPenalty(0.0);
        setAffectNeighbors(true);
        break;
      case 'accident':
        setBlocked(false);
        setTrafficFactor(5.0);
        setSafetyPenalty(20.0);
        setAffectNeighbors(false);
        break;
      case 'late_night_risk':
        setBlocked(false);
        setTrafficFactor(1.0);
        setSafetyPenalty(50.0);
        setAffectNeighbors(false);
        break;
      default:
        break;
    }
  };

  const baseCost = Math.round((segment.length / (Math.max(segment.speed_kph, 1) * (1000 / 3600))) * 10) / 10;
  const simulatedCost = blocked
    ? Infinity
    : Math.round(((segment.length / (Math.max(segment.speed_kph, 1) * (1000 / 3600))) * trafficFactor + safetyPenalty) * 10) / 10;

  const handleSave = () => {
    onSave({
      u: segment.u,
      v: segment.v,
      constraint_type: constraintType,
      blocked,
      traffic_factor: trafficFactor,
      safety_penalty: safetyPenalty,
      affect_neighbors: affectNeighbors,
      bidirectional,
    });
    onClose();
  };

  const handleRemove = () => {
    onRemove(segment.u, segment.v);
    onClose();
  };

  const presets = [
    { id: 'roadblock', name: 'Road Block', icon: Ban, color: 'text-red-400 border-red-500/30 hover:bg-red-500/10' },
    { id: 'traffic_jam', name: 'Traffic Jam', icon: Car, color: 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10' },
    { id: 'construction', name: 'Construction', icon: HardHat, color: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10' },
    { id: 'fire', name: 'Fire Emergency', icon: Flame, color: 'text-orange-400 border-orange-500/30 hover:bg-orange-500/10' },
    { id: 'accident', name: 'Accident (5x)', icon: AlertOctagon, color: 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10' },
    { id: 'late_night_risk', name: 'Late Night Risk', icon: Moon, color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl p-6 text-gray-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">Dynamic Road Constraint</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {segment.name} ({segment.u} → {segment.v})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Road Specs */}
        <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-gray-800/60 rounded-xl text-center border border-gray-800">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Length</span>
            <p className="text-sm font-semibold text-gray-200">{segment.length} m</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Speed Limit</span>
            <p className="text-sm font-semibold text-sky-400">{segment.speed_kph} km/h</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Base Cost</span>
            <p className="text-sm font-semibold text-emerald-400">{baseCost}s</p>
          </div>
        </div>

        {/* Semantic Scenario Presets */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Quick Semantic Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => {
              const Icon = p.icon;
              const isSelected = constraintType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                    isSelected 
                      ? 'bg-sky-600/20 border-sky-500 text-white shadow-sm ring-1 ring-sky-500' 
                      : `bg-gray-800/40 border-gray-700/60 text-gray-300 ${p.color}`
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine-Tuning Controls */}
        <div className="space-y-3.5 border-t border-gray-800 pt-3">
          {/* Road Blocked Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-800 hover:border-gray-700 transition">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-lg ${blocked ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                <Ban className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Full Road Closure</p>
                <p className="text-xs text-gray-400">Completely closes corridor (cost = &infin;)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={blocked}
                onChange={(e) => {
                  setBlocked(e.target.checked);
                  setConstraintType('custom');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {/* Fire Emergency Cordon perimeter notice */}
          {affectNeighbors && (
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0 text-orange-400" />
              <span>Fire emergency cordon active: surrounding adjacent intersection edges are also heavily penalized.</span>
            </div>
          )}

          {!blocked && (
            <>
              {/* Traffic Factor */}
              <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Traffic Jam Factor</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-amber-400">
                    {trafficFactor.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.2"
                  value={trafficFactor}
                  onChange={(e) => {
                    setTrafficFactor(parseFloat(e.target.value));
                    setConstraintType('custom');
                  }}
                  className="w-full accent-amber-500 bg-gray-700 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>1.0x (Normal)</span>
                  <span>3.0x (Heavy Jam)</span>
                  <span>6.0x (Gridlock)</span>
                </div>
              </div>

              {/* Safety Penalty */}
              <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Safety / Hazard Penalty</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-purple-400">
                    +{safetyPenalty.toFixed(0)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={safetyPenalty}
                  onChange={(e) => {
                    setSafetyPenalty(parseFloat(e.target.value));
                    setConstraintType('custom');
                  }}
                  className="w-full accent-purple-500 bg-gray-700 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>0s (Safe Arterial)</span>
                  <span>50s (Night Risk)</span>
                  <span>100s+ (Hazardous)</span>
                </div>
              </div>
            </>
          )}

          {/* Bidirectional apply */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-400">Apply to both directions if two-way street</span>
            <input
              type="checkbox"
              checked={bidirectional}
              onChange={(e) => setBidirectional(e.target.checked)}
              className="accent-sky-500 rounded cursor-pointer h-4 w-4"
            />
          </div>

          {/* Dynamic Cost Projection */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/70 border border-gray-800">
            <span className="text-xs text-gray-400">New Simulated Edge Cost:</span>
            <span className={`font-mono font-bold text-base ${blocked ? 'text-red-400' : 'text-sky-300'}`}>
              {blocked ? 'Blocked (∞)' : `${simulatedCost}s (${simulatedCost > baseCost ? `+${(simulatedCost - baseCost).toFixed(1)}s` : 'normal'})`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-gray-800">
          {currentConstraint ? (
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Reset Corridor
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition shadow-lg shadow-sky-600/30"
            >
              <Check className="w-4 h-4" />
              Apply Constraint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
