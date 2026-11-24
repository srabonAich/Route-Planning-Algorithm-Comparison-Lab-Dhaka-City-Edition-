import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.graph_loader import graph_manager
from backend.algorithms import run_all_algorithms

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Route Planning & Algorithm Comparison Lab - Dhaka Edition",
    description="Interactive comparison of BFS, UCS, A*, and Weighted A* on Dhaka City OpenStreetMap Road Graph",
    version="2.0.0"
)

# Enable CORS for frontend Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load graph at startup
@app.on_event("startup")
def startup_event():
    graph_manager.load_graph()
    logger.info("Dhaka road network initialized with %d nodes", len(graph_manager.graph.nodes))

class ConstraintItem(BaseModel):
    u: int
    v: int
    traffic_factor: float = Field(default=1.0, ge=0.1, le=10.0)
    safety_penalty: float = Field(default=0.0, ge=0.0, le=1000.0)
    blocked: bool = False
    bidirectional: bool = True
    constraint_type: Optional[str] = "custom"
    affect_neighbors: Optional[bool] = False

class RouteCompareRequest(BaseModel):
    source: Optional[int] = None
    target: Optional[int] = None
    source_name: Optional[str] = None
    target_name: Optional[str] = None
    constraints: List[ConstraintItem] = []
    weighted_a_weight: float = Field(default=1.6, ge=1.0, le=5.0)
    active_algorithm: Optional[str] = "A*"

def generate_comparative_summary(
    baseline_results: Dict[str, Any],
    constrained_results: Dict[str, Any],
    constraints: List[ConstraintItem]
) -> Dict[str, Any]:
    """Analyze and generate quantitative and qualitative insights between all 8 algorithms and reroutes."""
    algorithms = ["A*", "Weighted A*", "UCS", "GBFS", "BFS", "DFS", "DLS", "IDS"]
    table_rows = []

    # Find optimal cost (UCS and A* are provably optimal)
    optimal_base_cost = baseline_results.get("UCS", {}).get("total_cost", 0.0)
    optimal_detour_cost = constrained_results.get("UCS", {}).get("total_cost", 0.0)

    for alg in algorithms:
        b_res = baseline_results.get(alg, {})
        c_res = constrained_results.get(alg, {})

        b_cost = b_res.get("total_cost", 0.0)
        c_cost = c_res.get("total_cost", 0.0)
        b_nodes = b_res.get("nodes_expanded", 0)
        c_nodes = c_res.get("nodes_expanded", 0)
        exec_time = round(b_res.get("execution_time_ms", 0.0) + c_res.get("execution_time_ms", 0.0), 2)

        # Check optimality against UCS
        is_base_optimal = (b_res.get("success", False) and abs(b_cost - optimal_base_cost) < 0.2)
        is_constrained_optimal = (c_res.get("success", False) and abs(c_cost - optimal_detour_cost) < 0.2)
        is_optimal = is_base_optimal and is_constrained_optimal

        table_rows.append({
            "algorithm": alg,
            "baseline_cost": b_cost,
            "constrained_cost": c_cost,
            "baseline_nodes": b_nodes,
            "constrained_nodes": c_nodes,
            "total_runtime_ms": exec_time,
            "baseline_hops": len(b_res.get("path", [])),
            "constrained_hops": len(c_res.get("path", [])),
            "is_optimal": is_optimal,
            "success": c_res.get("success", False)
        })

    # Telemetry insights
    insights = []

    # 1. A* vs UCS Pruning
    if "UCS" in baseline_results and "A*" in baseline_results:
        ucs_nodes = baseline_results["UCS"].get("nodes_expanded", 0)
        astar_nodes = baseline_results["A*"].get("nodes_expanded", 0)
        if ucs_nodes > 0:
            pruned_pct = round(((ucs_nodes - astar_nodes) / ucs_nodes) * 100, 1)
            insights.append(
                f"Admissible Haversine Heuristic: A* pruned {pruned_pct}% of the search state space ({astar_nodes} vs {ucs_nodes} nodes expanded) across the Dhaka street network while strictly matching UCS cost-optimality ({optimal_base_cost}s)."
            )

    # 2. Weighted A* trade-off
    if "Weighted A*" in baseline_results and "A*" in baseline_results:
        w_astar_nodes = baseline_results["Weighted A*"].get("nodes_expanded", 0)
        astar_nodes = baseline_results["A*"].get("nodes_expanded", 0)
        if astar_nodes > 0:
            w_savings = round(((astar_nodes - w_astar_nodes) / astar_nodes) * 100, 1)
            w_cost = baseline_results["Weighted A*"].get("total_cost", 0.0)
            if abs(w_cost - optimal_base_cost) < 0.2:
                insights.append(
                    f"Weighted A* Search: Accelerated exploration down to only {w_astar_nodes} nodes ({w_savings}% fewer than standard A*) and successfully discovered the exact optimal route."
                )
            else:
                penalty = round(w_cost - optimal_base_cost, 1)
                insights.append(
                    f"Weighted A* Trade-off: Traded optimality for rapid exploration ({w_astar_nodes} nodes vs {astar_nodes} in A*), incurring a minor +{penalty}s cost trade-off."
                )

    # 3. GBFS Greedy Directedness
    if "GBFS" in baseline_results:
        gbfs_res = baseline_results["GBFS"]
        if gbfs_res.get("success"):
            gbfs_cost = gbfs_res.get("total_cost", 0.0)
            cost_ratio = round(gbfs_cost / max(optimal_base_cost, 0.1), 2)
            insights.append(
                f"Greedy Best-First Search (GBFS): Evaluated strictly by heuristic distance h(n) ({gbfs_res.get('nodes_expanded')} nodes). Path cost is {gbfs_cost}s ({cost_ratio}x of optimal), illustrating why GBFS is incomplete without cost accumulation g(n)."
            )

    # 4. BFS Hop vs Travel Time
    if "BFS" in baseline_results:
        bfs_res = baseline_results["BFS"]
        bfs_cost = bfs_res.get("total_cost", 0.0)
        if bfs_cost > optimal_base_cost + 0.5:
            diff = round(bfs_cost - optimal_base_cost, 1)
            insights.append(
                f"BFS Sub-optimality: BFS minimized pure intersection count ({len(bfs_res.get('path', []))} hops) but ignored highway speeds and travel times, resulting in a +{diff}s travel delay."
            )
        else:
            insights.append(
                f"BFS Hop Equivalence: For this specific pair, the minimum-hop trajectory closely aligned with the minimum-time corridor."
            )

    # 5. DFS / DLS / IDS State Space Behavior
    if "DFS" in baseline_results and baseline_results["DFS"].get("success"):
        dfs_hops = len(baseline_results["DFS"].get("path", []))
        opt_hops = len(baseline_results.get("A*", {}).get("path", []))
        insights.append(
            f"Depth-First Search (DFS): Followed deep structural branches, taking {dfs_hops} hops compared to {opt_hops} optimal hops, highlighting extreme topological drift in cyclic road networks."
        )

    # 6. Global Rerouting Impact
    blocked_count = sum(1 for c in constraints if c.blocked)
    traffic_count = sum(1 for c in constraints if not c.blocked and c.traffic_factor > 1.0)
    safety_count = sum(1 for c in constraints if not c.blocked and c.safety_penalty > 0.0)

    if blocked_count > 0 or traffic_count > 0 or safety_count > 0:
        if optimal_detour_cost > 0:
            detour_penalty = round(optimal_detour_cost - optimal_base_cost, 1)
            detour_pct = round((detour_penalty / max(optimal_base_cost, 0.1)) * 100, 1)
            insights.append(
                f"Global Reroute Telemetry: Applied {blocked_count} roadblock(s), {traffic_count} congestion zone(s), and {safety_count} safety penalty(ies). Global recalculation produced an optimal detour with a +{detour_penalty}s ({detour_pct}%) delay compared to baseline."
            )
        else:
            insights.append(
                "Trapped Destination Alert: Applied constraints severed all viable arterial connections; destination unreachable."
            )

    successful_rows = [r for r in table_rows if r["success"]]
    fewest_nodes_alg = min(successful_rows, key=lambda x: x["constrained_nodes"])["algorithm"] if successful_rows else "N/A"

    return {
        "table": table_rows,
        "insights": insights,
        "optimal_baseline_cost": optimal_base_cost,
        "optimal_constrained_cost": optimal_detour_cost,
        "fewest_nodes_expanded_alg": fewest_nodes_alg
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "city": "Dhaka, Bangladesh",
        "nodes": len(graph_manager.graph.nodes) if graph_manager.graph else 0,
        "edges": len(graph_manager.graph.edges) if graph_manager.graph else 0
    }

@app.get("/api/locations")
def get_locations():
    """Returns canonical popular Dhaka hubs and neighborhoods."""
    if graph_manager.graph is None:
        graph_manager.load_graph()
    return {
        "locations": list(graph_manager.locations_resolved.values())
    }

@app.get("/api/graph")
def get_graph_metadata():
    """Returns Dhaka bounding box, center, and default hubs without heavy 60k edge geometry payloads."""
    if graph_manager.graph is None:
        graph_manager.load_graph()

    dhanmondi = graph_manager.locations_resolved.get("Dhanmondi")
    mirpur = graph_manager.locations_resolved.get("Mirpur 10")

    default_source = dhanmondi["node_id"] if dhanmondi else list(graph_manager.graph.nodes())[0]
    default_target = mirpur["node_id"] if mirpur else list(graph_manager.graph.nodes())[-1]

    return {
        "city": "Dhaka, Bangladesh",
        "bbox": graph_manager.bbox,
        "default_source": default_source,
        "default_target": default_target,
        "default_source_name": "Dhanmondi",
        "default_target_name": "Mirpur 10",
        "total_nodes": len(graph_manager.graph.nodes),
        "total_edges": len(graph_manager.graph.edges),
        "max_speed_kph": graph_manager.max_speed_kph,
        "popular_locations": list(graph_manager.locations_resolved.values())
    }

@app.post("/api/route/compare")
def compare_routes(payload: RouteCompareRequest):
    """
    Runs all 4 algorithms on baseline graph, applies constraints,
    re-runs all 4 algorithms on constrained graph using Global Rerouting.
    Accepts either named locations (e.g., 'Dhanmondi', 'Mirpur 10') or raw node IDs.
    """
    if graph_manager.graph is None:
        graph_manager.load_graph()

    # 1. Resolve source
    resolved_source = None
    if payload.source_name:
        resolved_source = graph_manager.resolve_location_query(payload.source_name)
        source = resolved_source["node_id"]
    elif payload.source is not None:
        source = payload.source
        if source not in graph_manager.graph:
            raise HTTPException(status_code=400, detail=f"Source node {source} not in graph.")
        s_coord = graph_manager.node_coords[source]
        resolved_source = {
            "name": f"Node #{source}",
            "lat": s_coord["lat"],
            "lng": s_coord["lng"],
            "node_id": source
        }
    else:
        dhan = graph_manager.locations_resolved.get("Dhanmondi")
        source = dhan["node_id"] if dhan else list(graph_manager.graph.nodes())[0]
        resolved_source = dhan

    # 2. Resolve target
    resolved_target = None
    if payload.target_name:
        resolved_target = graph_manager.resolve_location_query(payload.target_name)
        target = resolved_target["node_id"]
    elif payload.target is not None:
        target = payload.target
        if target not in graph_manager.graph:
            raise HTTPException(status_code=400, detail=f"Target node {target} not in graph.")
        t_coord = graph_manager.node_coords[target]
        resolved_target = {
            "name": f"Node #{target}",
            "lat": t_coord["lat"],
            "lng": t_coord["lng"],
            "node_id": target
        }
    else:
        mirp = graph_manager.locations_resolved.get("Mirpur 10")
        target = mirp["node_id"] if mirp else list(graph_manager.graph.nodes())[-1]
        resolved_target = mirp

    # 3. Baseline Search on original unconstrained graph
    baseline_results = run_all_algorithms(
        graph=graph_manager.graph,
        source=source,
        target=target,
        node_coords=graph_manager.node_coords,
        max_speed_mps=graph_manager.max_speed_mps,
        weight=payload.weighted_a_weight
    )

    # 4. Constrained Search on modified graph
    constraints_dicts = [c.dict() for c in payload.constraints]
    constrained_graph = graph_manager.apply_constraints(constraints_dicts)

    constrained_results = run_all_algorithms(
        graph=constrained_graph,
        source=source,
        target=target,
        node_coords=graph_manager.node_coords,
        max_speed_mps=graph_manager.max_speed_mps,
        weight=payload.weighted_a_weight
    )

    # 5. Comparative Summary
    summary = generate_comparative_summary(baseline_results, constrained_results, payload.constraints)

    return {
        "source": source,
        "target": target,
        "resolved_source": resolved_source,
        "resolved_target": resolved_target,
        "constraints": payload.constraints,
        "baseline": baseline_results,
        "constrained": constrained_results,
        "summary": summary
    }

@app.get("/api/presets")
def get_presets():
    """Preconfigured scenario presets for Dhaka city corridors with semantic categories."""
    if graph_manager.graph is None:
        graph_manager.load_graph()

    # Begum Rokeya Sarani corridor (between Farmgate/Agargaon and Mirpur 10)
    rokeya_u, rokeya_v = 9993252763, 2274705447
    # Dhanmondi connection corridor
    dhan_u, dhan_v = 642632761, 267089201

    return {
        "presets": [
            {
                "id": "rokeya_sarani_blocked",
                "name": "Begum Rokeya Sarani Roadblock",
                "category": "roadblock",
                "description": "Primary Mirpur corridor completely blocked due to civic works. Forces global rerouting via Beribadh or Gabtoli.",
                "constraints": [
                    {
                        "u": rokeya_u,
                        "v": rokeya_v,
                        "traffic_factor": 1.0,
                        "safety_penalty": 0.0,
                        "blocked": True,
                        "constraint_type": "roadblock",
                        "bidirectional": True
                    }
                ]
            },
            {
                "id": "farmgate_rush_hour",
                "name": "Farmgate-Mirpur Traffic Jam (4x Delay)",
                "category": "traffic_jam",
                "description": "Peak morning gridlock along Begum Rokeya and Dhanmondi corridors testing time-optimal vs hop-optimal path choices.",
                "constraints": [
                    {
                        "u": rokeya_u,
                        "v": rokeya_v,
                        "traffic_factor": 4.0,
                        "safety_penalty": 0.0,
                        "blocked": False,
                        "constraint_type": "traffic_jam",
                        "bidirectional": True
                    },
                    {
                        "u": dhan_u,
                        "v": dhan_v,
                        "traffic_factor": 3.0,
                        "safety_penalty": 0.0,
                        "blocked": False,
                        "constraint_type": "traffic_jam",
                        "bidirectional": True
                    }
                ]
            },
            {
                "id": "construction_agargaon",
                "name": "Agargaon Metro Station Construction",
                "category": "construction",
                "description": "Active road construction with lane narrowing, adding moderate 2.0x delay and +10s safety hazard penalty.",
                "constraints": [
                    {
                        "u": rokeya_u,
                        "v": rokeya_v,
                        "traffic_factor": 2.0,
                        "safety_penalty": 10.0,
                        "blocked": False,
                        "constraint_type": "construction",
                        "bidirectional": True
                    }
                ]
            },
            {
                "id": "fire_emergency_cordon",
                "name": "Mirpur-Agargaon Fire Emergency Cordon",
                "category": "fire",
                "description": "Major structural fire requiring full road closure and emergency perimeter cordon across adjacent intersections.",
                "constraints": [
                    {
                        "u": rokeya_u,
                        "v": rokeya_v,
                        "traffic_factor": 1.0,
                        "safety_penalty": 0.0,
                        "blocked": True,
                        "constraint_type": "fire",
                        "affect_neighbors": True,
                        "bidirectional": True
                    }
                ]
            },
            {
                "id": "accident_severe",
                "name": "Multi-Vehicle Road Accident (5x Delay)",
                "category": "accident",
                "description": "Severe highway collision blocking multiple lanes, resulting in 5.0x traffic crawl and +20s hazard factor.",
                "constraints": [
                    {
                        "u": rokeya_u,
                        "v": rokeya_v,
                        "traffic_factor": 5.0,
                        "safety_penalty": 20.0,
                        "blocked": False,
                        "constraint_type": "accident",
                        "bidirectional": True
                    }
                ]
            },
            {
                "id": "late_night_alley_risk",
                "name": "Late-Night Alley Risk (+50s)",
                "category": "late_night_risk",
                "description": "Applies a +50s safety penalty to secondary unlit corridors, encouraging algorithms to route via illuminated boulevards.",
                "constraints": [
                    {
                        "u": dhan_u,
                        "v": dhan_v,
                        "traffic_factor": 1.0,
                        "safety_penalty": 50.0,
                        "blocked": False,
                        "constraint_type": "late_night_risk",
                        "bidirectional": True
                    }
                ]
            }
        ]
    }
