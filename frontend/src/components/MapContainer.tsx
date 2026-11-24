import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  MapContainer as LeafletMap,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { ConstraintItem, SegmentItem, LocationItem } from '../types';

interface MapViewProps {
  sourceLocation: LocationItem | null;
  targetLocation: LocationItem | null;
  selectedAlgorithm: string;
  visitedSequence: [number, number][];
  resultPath: [number, number][];
  detourPath?: [number, number][];
  constraints: ConstraintItem[];
  constrainedSegments: SegmentItem[];
  center: [number, number];
  animationSpeed: number; // 1 to 100
  isPaused: boolean;
  visualizeTrigger: number;
  skipTrigger: number;
  resetTrigger: number;
  onSelectSegment: (segment: SegmentItem) => void;
  onProgress?: (current: number, total: number) => void;
  onStatusChange?: (isAnimating: boolean, showFinalPath: boolean) => void;
}

// Auto-adjust view on route source/target changes
const MapBoundsAdjuster: React.FC<{
  coordsA?: [number, number][];
  coordsB?: [number, number][];
  center: [number, number];
}> = ({ coordsA, coordsB, center }) => {
  const map = useMap();
  const lastBoundsKey = useRef<string>('');

  useEffect(() => {
    const allCoords = [...(coordsA || []), ...(coordsB || [])];
    if (allCoords.length > 2) {
      const key = `${allCoords[0][0]}-${allCoords[0][1]}-${allCoords[allCoords.length - 1][0]}-${allCoords[allCoords.length - 1][1]}`;
      if (lastBoundsKey.current !== key) {
        lastBoundsKey.current = key;
        const bounds = L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1])));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      }
    } else {
      map.setView(center, 13, { animate: true });
    }
  }, [coordsA, coordsB, center, map]);

  return null;
};

// Direct Leaflet Canvas rendering for blue exploration dots outside React VDOM
// Zero DOM overhead, 0 React Fiber reconciliation lag, 60 FPS panning/zooming
const DirectLeafletCanvasDots: React.FC<{
  nodes: [number, number][];
  isAnimating: boolean;
}> = ({ nodes, isAnimating }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '350';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const render = () => {
      if (!canvas) return;
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      if (nodes.length === 0) return;

      const w = size.x;
      const h = size.y;

      // Draw all explored nodes as crisp blue dots
      ctx.fillStyle = '#2563eb'; // Royal Blue
      const radius = 3.2;

      for (let i = 0; i < nodes.length; i++) {
        const [lat, lng] = nodes[i];
        const pt = map.latLngToContainerPoint([lat, lng]);

        // Viewport culling
        if (pt.x < -10 || pt.x > w + 10 || pt.y < -10 || pt.y > h + 10) continue;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw animated expansion tip head while actively exploring
      if (isAnimating && nodes.length > 0) {
        const [latestLat, latestLng] = nodes[nodes.length - 1];
        const activePt = map.latLngToContainerPoint([latestLat, latestLng]);

        if (activePt.x >= -20 && activePt.x <= w + 20 && activePt.y >= -20 && activePt.y <= h + 20) {
          // Glow ring
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(activePt.x, activePt.y, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Gold center
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(activePt.x, activePt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);
    render();

    return () => {
      map.off('move', render);
      map.off('zoom', render);
      map.off('resize', render);
    };
  }, [map, nodes, isAnimating]);

  useEffect(() => {
    return () => {
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);

  return null;
};

// Custom SVG Markers for Source and Target
const createPinIcon = (label: string, bgClass: string, pulseClass: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-9 h-9 rounded-full ${bgClass} text-white font-extrabold flex items-center justify-center shadow-2xl border-2 border-white ${pulseClass} text-xs">
          ${label}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const sourceIcon = createPinIcon('SRC', 'bg-emerald-600', 'marker-source-pulse');
const targetIcon = createPinIcon('DST', 'bg-rose-600', 'marker-target-pulse');

export const MapContainer: React.FC<MapViewProps> = ({
  sourceLocation,
  targetLocation,
  selectedAlgorithm,
  visitedSequence,
  resultPath,
  detourPath,
  constraints,
  constrainedSegments,
  center,
  animationSpeed,
  isPaused,
  visualizeTrigger,
  skipTrigger,
  resetTrigger,
  onSelectSegment,
  onProgress,
  onStatusChange,
}) => {
  // Required Animation State Variables
  const [visualizedNodes, setVisualizedNodes] = useState<[number, number][]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showFinalPath, setShowFinalPath] = useState<boolean>(false);

  const currentIndexRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Map speed slider (1 to 100) to interval delay (200ms down to 1ms) and batch size N
  const getDelayAndBatch = (speed: number) => {
    if (speed <= 5) {
      // 1x = 200ms, single dot step
      const delay = Math.max(1, Math.round(200 - (speed - 1) * 20));
      return { delay, batch: 1 };
    } else if (speed <= 15) {
      // 15x = 40ms, single dot step
      const delay = Math.max(1, Math.round(120 - (speed - 5) * 8));
      return { delay, batch: 1 };
    } else if (speed <= 35) {
      // 35x = 16ms, 2 dots step
      const delay = Math.max(1, Math.round(40 - (speed - 15) * 1.2));
      return { delay, batch: 2 };
    } else if (speed <= 70) {
      // 70x = 6ms
      const delay = Math.max(1, Math.round(16 - (speed - 35) * 0.3));
      return { delay, batch: Math.max(3, Math.round(speed / 5)) };
    } else {
      // 100x = 1-2ms rapid
      const delay = Math.max(1, Math.round(5 - (speed - 70) * 0.1));
      return { delay, batch: Math.max(10, Math.round(speed / 2.5)) };
    }
  };

  // Sync animation status to parent component
  useEffect(() => {
    onStatusChange?.(isAnimating, showFinalPath);
  }, [isAnimating, showFinalPath, onStatusChange]);

  // Sync progress count
  useEffect(() => {
    onProgress?.(visualizedNodes.length, visitedSequence.length);
  }, [visualizedNodes.length, visitedSequence.length, onProgress]);

  // Start new animation: Click "Visualize" -> Clear existing paths -> Animate blue dots -> showFinalPath becomes True on completion
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (visitedSequence.length === 0) {
      setVisualizedNodes([]);
      setIsAnimating(false);
      setShowFinalPath(false);
      currentIndexRef.current = 0;
      return;
    }

    // Clear existing paths, hide red lines, start animating blue dots
    currentIndexRef.current = 0;
    setVisualizedNodes([]);
    setShowFinalPath(false);
    setIsAnimating(true);
  }, [visualizeTrigger, visitedSequence]);

  // Skip to End trigger: instantly finish animation and show final path
  useEffect(() => {
    if (skipTrigger === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    currentIndexRef.current = visitedSequence.length;
    setVisualizedNodes(visitedSequence);
    setIsAnimating(false);
    setShowFinalPath(true);
  }, [skipTrigger, visitedSequence]);

  // Reset trigger: restart animation from zero
  useEffect(() => {
    if (resetTrigger === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    currentIndexRef.current = 0;
    setVisualizedNodes([]);
    setShowFinalPath(false);
    setIsAnimating(true);
  }, [resetTrigger]);

  // Animation Loop: Interval tied to Animation Speed slider
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isAnimating || isPaused || visitedSequence.length === 0) {
      return;
    }

    const { delay, batch } = getDelayAndBatch(animationSpeed);

    intervalRef.current = setInterval(() => {
      const nextIndex = Math.min(currentIndexRef.current + batch, visitedSequence.length);
      currentIndexRef.current = nextIndex;

      // Slice the next N nodes from visitedSequence
      setVisualizedNodes(visitedSequence.slice(0, nextIndex));

      // Animation ends -> clear interval -> showFinalPath becomes True -> render final path
      if (nextIndex >= visitedSequence.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsAnimating(false);
        setShowFinalPath(true);
      }
    }, delay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAnimating, isPaused, visitedSequence, animationSpeed]);

  // Map of active constraints for fast lookup
  const constraintMap = useMemo(() => {
    const map = new Map<string, ConstraintItem>();
    constraints.forEach((c) => {
      map.set(`${c.u}-${c.v}`, c);
      if (c.bidirectional) {
        map.set(`${c.v}-${c.u}`, c);
      }
    });
    return map;
  }, [constraints]);

  // Filter constrained segments to only those with user constraints applied
  const userConstrainedSegments = useMemo(() => {
    return constrainedSegments.filter(
      (seg) => constraintMap.has(`${seg.u}-${seg.v}`) || constraintMap.has(`${seg.v}-${seg.u}`)
    );
  }, [constrainedSegments, constraintMap]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-950">
      <LeafletMap
        center={center}
        zoom={13}
        zoomControl={false}
        preferCanvas={true}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* Explicit Zoom Controls (+ / -) in bottom-right */}
        <ZoomControl position="bottomright" />

        <MapBoundsAdjuster
          coordsA={resultPath}
          coordsB={detourPath}
          center={center}
        />

        {/* 1. Free, standard OpenStreetMap Tiles with NO API Key needed */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* 2. Direct Leaflet Canvas rendering for blue exploration dots (Zero DOM overhead) */}
        <DirectLeafletCanvasDots
          nodes={visualizedNodes}
          isAnimating={isAnimating}
        />

        {/* Single exploration polyline trace for smooth visualization */}
        {visualizedNodes.length > 1 && (
          <Polyline
            positions={visualizedNodes}
            pathOptions={{
              color: '#2563eb',
              weight: 4,
              opacity: 0.35,
            }}
          />
        )}

        {/* 3. Final Path Polyline (RED LINE) rendered ONLY when showFinalPath is true on top of blue dots */}
        {showFinalPath && resultPath.length > 0 && (
          <Polyline
            positions={resultPath}
            pathOptions={{
              color: '#ef4444', // Red line as requested
              weight: 6,
              opacity: 0.95,
            }}
          >
            <Tooltip sticky>
              <div className="text-xs p-1">
                <span className="font-bold text-red-600">
                  Actual/Final Route ({selectedAlgorithm})
                </span>
                <div className="text-gray-700">
                  Hops: {resultPath.length} | Explored: {visitedSequence.length} nodes
                </div>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* Detour Route Polyline (rendered on top of blue dots when showFinalPath is true) */}
        {showFinalPath && detourPath && detourPath.length > 0 && (
          <Polyline
            positions={detourPath}
            pathOptions={{
              color: '#0284c7', // Sky Blue Detour
              weight: 6,
              opacity: 0.95,
            }}
          >
            <Tooltip sticky>
              <div className="text-xs p-1">
                <span className="font-bold text-sky-700">
                  Global Detour Route ({selectedAlgorithm})
                </span>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* 4. Active Road Blocks & Constrained Edges Highlighted on Map */}
        {userConstrainedSegments.map((seg, idx) => {
          const c = constraintMap.get(`${seg.u}-${seg.v}`) || constraintMap.get(`${seg.v}-${seg.u}`);
          const isBlocked = c ? c.blocked : seg.blocked;
          const isFire = c?.constraint_type === 'fire';
          const isTraffic = c ? !c.blocked && c.traffic_factor > 1.2 : false;
          const isSafety = c ? !c.blocked && c.safety_penalty > 0 : false;

          const color = isBlocked ? '#ef4444' : isFire ? '#f97316' : isTraffic ? '#f59e0b' : isSafety ? '#a855f7' : '#ef4444';

          return (
            <Polyline
              key={`constrained-seg-${seg.u}-${seg.v}-${idx}`}
              positions={seg.geometry}
              pathOptions={{
                color: color,
                weight: 8,
                opacity: 0.95,
                dashArray: isBlocked ? '6, 6' : undefined,
              }}
              eventHandlers={{
                click: () => onSelectSegment(seg),
              }}
            >
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <div className="font-bold text-red-600">
                    {isBlocked ? '⛔ ROAD CLOSED / BLOCKED' : isFire ? '🔥 FIRE CORDON PERIMETER' : isTraffic ? '🚗 SEVERE TRAFFIC JAM' : '⚠️ HIGH RISK PENALTY'}
                  </div>
                  <div className="font-medium text-gray-800">{seg.name}</div>
                  <div className="text-gray-600">
                    {isBlocked ? 'Traversal Blocked (∞)' : `Delay: ${c?.traffic_factor || 1}x | Risk: +${c?.safety_penalty || 0}s`}
                  </div>
                  <div className="text-sky-600 font-semibold mt-0.5">Click to inspect or change constraint</div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* 5. Source Pin */}
        {sourceLocation && (
          <Marker position={[sourceLocation.lat, sourceLocation.lng]} icon={sourceIcon}>
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <div className="font-bold text-emerald-700 text-xs px-1">
                🟢 {sourceLocation.name}
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* 6. Destination Pin */}
        {targetLocation && (
          <Marker position={[targetLocation.lat, targetLocation.lng]} icon={targetIcon}>
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <div className="font-bold text-rose-700 text-xs px-1">
                🔴 {targetLocation.name}
              </div>
            </Tooltip>
          </Marker>
        )}
      </LeafletMap>

      {/* Floating Exploration Status Banner */}
      {isAnimating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-gray-900/90 backdrop-blur-md border border-blue-500/50 rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-2.5 text-xs pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <span className="text-gray-200 font-medium">
            Exploring <strong className="text-blue-400">{selectedAlgorithm}</strong> Graph State Space...
          </span>
          <span className="font-mono text-blue-300 font-semibold">
            {visualizedNodes.length} / {visitedSequence.length} nodes
          </span>
        </div>
      )}

      {/* Floating HUD Legend */}
      <div className="absolute top-4 right-4 z-[400] bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-3 shadow-2xl max-w-xs text-xs space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
          <span className="font-semibold text-white tracking-wide uppercase text-[10px]">Active Route Display</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-semibold">
            {selectedAlgorithm}
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span className="text-gray-300">Explored Nodes (Blue Dots)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-red-500 inline-block rounded" />
            <span className="text-gray-300">Actual/Final Path (Red Line)</span>
          </div>
          {detourPath && detourPath.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-sky-500 inline-block rounded" />
              <span className="text-gray-300">Global Detour Route (Sky Blue)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-red-500 border-b-2 border-dashed border-red-300 inline-block" />
            <span className="text-gray-300">Road Blockade (Closed)</span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-1.5 text-[10px] text-gray-400">
          Tip: Move Animation Speed slider to slow down or speed up dots.
        </div>
      </div>
    </div>
  );
};
