export type AlgorithmType = 
  | "A*" 
  | "Weighted A*" 
  | "UCS" 
  | "GBFS" 
  | "BFS" 
  | "DFS" 
  | "DLS" 
  | "IDS";

export interface AlgorithmMeta {
  id: AlgorithmType;
  name: string;
  category: "Informed" | "Uninformed";
  optimality: "Provably Cost-Optimal" | "Hop-Optimal" | "Suboptimal (Bounded)" | "Non-Optimal";
  heuristic: string;
  description: string;
  badgeColor: string;
}

export const ALGORITHM_METAS: Record<AlgorithmType, AlgorithmMeta> = {
  "A*": {
    id: "A*",
    name: "A* Search",
    category: "Informed",
    optimality: "Provably Cost-Optimal",
    heuristic: "h(n) = Haversine / MaxSpeed",
    description: "Evaluates f(n) = g(n) + h(n). Prunes non-promising directions while strictly guaranteeing minimal travel cost.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
  },
  "Weighted A*": {
    id: "Weighted A*",
    name: "Weighted A* (w=1.6)",
    category: "Informed",
    optimality: "Suboptimal (Bounded)",
    heuristic: "f(n) = g(n) + 1.6·h(n)",
    description: "Inflates heuristic weight to aggressively drive exploration toward the goal, trading a minor cost factor for drastically fewer node expansions.",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30"
  },
  "UCS": {
    id: "UCS",
    name: "Uniform Cost Search (Dijkstra)",
    category: "Uninformed",
    optimality: "Provably Cost-Optimal",
    heuristic: "None (h=0)",
    description: "Expands lowest accumulated cost g(n) first in concentric time contours. Guaranteed optimal path, but explores all radial directions.",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
  },
  "GBFS": {
    id: "GBFS",
    name: "Greedy Best-First Search",
    category: "Informed",
    optimality: "Non-Optimal",
    heuristic: "h(n) strictly",
    description: "Expands nodes purely closest to the goal in straight-line distance. Rapidly reaches destination but often trapped by circuitous detours.",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30"
  },
  "BFS": {
    id: "BFS",
    name: "Breadth-First Search",
    category: "Uninformed",
    optimality: "Hop-Optimal",
    heuristic: "None",
    description: "Minimizes intersection count (hops) level-by-level. Completely ignores travel time and speed limits.",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30"
  },
  "DFS": {
    id: "DFS",
    name: "Depth-First Search (Cycle-Checked)",
    category: "Uninformed",
    optimality: "Non-Optimal",
    heuristic: "None",
    description: "Follows deep structural street branches using a stack. Prone to extreme winding detours in city grids; bounded for stability.",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30"
  },
  "DLS": {
    id: "DLS",
    name: "Depth-Limited Search (Depth=120)",
    category: "Uninformed",
    optimality: "Non-Optimal",
    heuristic: "None",
    description: "DFS bounded to a strict maximum search depth limit to prevent infinite drift into distant sectors.",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/30"
  },
  "IDS": {
    id: "IDS",
    name: "Iterative Deepening Search",
    category: "Uninformed",
    optimality: "Hop-Optimal",
    heuristic: "None",
    description: "Repeatedly executes depth-limited search with increasing depth bounds. Combines BFS completeness with DFS low memory footprint.",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
  }
};

export interface LocationItem {
  key: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  node_id: number;
  node_lat?: number;
  node_lng?: number;
  dist_meters?: number;
}

export interface NodeItem {
  id: number;
  lat: number;
  lng: number;
  street_count?: number;
}

export interface SegmentItem {
  u: number;
  v: number;
  name: string;
  length: number;
  speed_kph: number;
  cost: number;
  traffic_factor: number;
  safety_penalty: number;
  blocked: boolean;
  constraint_type?: string;
  geometry: [number, number][];
}

export interface ConstraintItem {
  u: number;
  v: number;
  traffic_factor: number;
  safety_penalty: number;
  blocked: boolean;
  bidirectional?: boolean;
  constraint_type?: string;
  affect_neighbors?: boolean;
}

export interface AlgorithmResult {
  algorithm: string;
  name: string;
  path: number[];
  coordinates: [number, number][];
  visited_node_sequence?: [number, number][];
  segments?: SegmentItem[];
  hops?: number;
  total_cost: number;
  nodes_expanded: number;
  execution_time_ms: number;
  success: boolean;
}

export interface SummaryRow {
  algorithm: string;
  baseline_cost: number;
  constrained_cost: number;
  baseline_nodes: number;
  constrained_nodes: number;
  total_runtime_ms: number;
  baseline_hops: number;
  constrained_hops: number;
  is_optimal: boolean;
  success: boolean;
}

export interface ComparativeSummary {
  table: SummaryRow[];
  insights: string[];
  optimal_baseline_cost: number;
  optimal_constrained_cost: number;
  fewest_nodes_expanded_alg: string;
}

export interface GraphResponse {
  city: string;
  bbox: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
    center_lat: number;
    center_lng: number;
  };
  default_source: number;
  default_target: number;
  default_source_name?: string;
  default_target_name?: string;
  total_nodes: number;
  total_edges: number;
  max_speed_kph: number;
  popular_locations: LocationItem[];
}

export interface CompareResponse {
  source: number;
  target: number;
  resolved_source?: LocationItem;
  resolved_target?: LocationItem;
  constraints: ConstraintItem[];
  baseline: Record<string, AlgorithmResult>;
  constrained: Record<string, AlgorithmResult>;
  summary: ComparativeSummary;
}

export interface PresetItem {
  id: string;
  name: string;
  category?: string;
  description: string;
  constraints: ConstraintItem[];
}
