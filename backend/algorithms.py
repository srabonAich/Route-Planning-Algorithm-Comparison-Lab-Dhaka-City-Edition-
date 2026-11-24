import math
import time
import heapq
from collections import deque
from typing import Dict, List, Any, Optional, Tuple, Set

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def extract_path_and_segments(
    graph,
    parent: Dict[int, Optional[int]], 
    source: int, 
    target: int, 
    node_coords: Dict[int, Dict[str, float]]
) -> Tuple[List[int], List[List[float]], List[Dict[str, Any]]]:
    """Reconstruct path from source to target and extract curved coordinates and segment metadata."""
    path = []
    curr = target
    while curr is not None:
        path.append(curr)
        if curr == source:
            break
        curr = parent.get(curr)
    path.reverse()
    
    if not path or path[0] != source:
        return [], [], []

    detailed_coords = []
    segments = []

    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        edge_data = graph[u][v] if graph.has_edge(u, v) else {}

        geom = edge_data.get("geometry_coords")
        if not geom:
            u_c = node_coords.get(u, {"lat": 0.0, "lng": 0.0})
            v_c = node_coords.get(v, {"lat": 0.0, "lng": 0.0})
            geom = [[u_c["lat"], u_c["lng"]], [v_c["lat"], v_c["lng"]]]

        if not detailed_coords:
            detailed_coords.extend(geom)
        else:
            if detailed_coords[-1] == geom[0]:
                detailed_coords.extend(geom[1:])
            else:
                detailed_coords.extend(geom)

        segments.append({
            "u": u,
            "v": v,
            "name": edge_data.get("name", f"Road ({u}→{v})"),
            "length": round(edge_data.get("length", 0.0), 1),
            "speed_kph": round(edge_data.get("speed_kph", 35.0), 1),
            "cost": round(edge_data.get("cost", 0.0), 1),
            "traffic_factor": edge_data.get("traffic_factor", 1.0),
            "safety_penalty": edge_data.get("safety_penalty", 0.0),
            "blocked": edge_data.get("blocked", False),
            "hazard_zone": edge_data.get("hazard_zone", False),
            "geometry": geom
        })

    return path, detailed_coords, segments

def calculate_path_cost(graph, path: List[int]) -> float:
    """Calculate the actual total cost of a path according to current graph edge costs."""
    if len(path) < 2:
        return 0.0
    total = 0.0
    for u, v in zip(path[:-1], path[1:]):
        if graph.has_edge(u, v):
            edge_data = graph[u][v]
            total += edge_data.get("cost", edge_data.get("length", 1.0))
        else:
            total += 1.0
    return round(total, 2)

# Maximum sequence length sent over JSON to ensure 60fps rendering without bloat
MAX_VISITED_SEQUENCE = 12000

def sample_visited_sequence(seq: List[List[float]]) -> List[List[float]]:
    if len(seq) <= MAX_VISITED_SEQUENCE:
        return seq
    step = math.ceil(len(seq) / MAX_VISITED_SEQUENCE)
    sampled = seq[::step]
    if seq and sampled and sampled[-1] != seq[-1]:
        sampled.append(seq[-1])
    return sampled

# ==============================================================================
# 1. Breadth-First Search (BFS)
# ==============================================================================
def bfs_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]]
) -> Dict[str, Any]:
    """Breadth-First Search (BFS): Uninformed. Optimizes only for hop count."""
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": "BFS",
            "name": "Breadth-First Search",
            "type": "Uninformed (Hop-Count)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    if source == target:
        coords = [[node_coords[source]["lat"], node_coords[source]["lng"]]] if source in node_coords else []
        return {
            "algorithm": "BFS",
            "name": "Breadth-First Search",
            "type": "Uninformed (Hop-Count)",
            "path": [source],
            "coordinates": coords,
            "segments": [],
            "visited_node_sequence": coords,
            "total_cost": 0.0,
            "nodes_expanded": 1,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 1,
            "success": True
        }

    queue = deque([source])
    visited = {source}
    parent = {source: None}
    found = False

    while queue:
        u = queue.popleft()
        nodes_expanded += 1
        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u == target:
            found = True
            break

        for v, edge_data in graph[u].items():
            if edge_data.get("blocked", False):
                continue
            if v not in visited:
                visited.add(v)
                parent[v] = u
                queue.append(v)

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found and target not in parent:
        return {
            "algorithm": "BFS",
            "name": "Breadth-First Search",
            "type": "Uninformed (Hop-Count)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = calculate_path_cost(graph, path)

    return {
        "algorithm": "BFS",
        "name": "Breadth-First Search",
        "type": "Uninformed (Hop-Count)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": len(path) > 0
    }

# ==============================================================================
# 2. Uniform Cost Search (UCS / Dijkstra)
# ==============================================================================
def ucs_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]]
) -> Dict[str, Any]:
    """Uniform Cost Search (UCS / Dijkstra): Uninformed. Guarantees cost-optimal traversal."""
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": "UCS",
            "name": "Uniform Cost Search (Dijkstra)",
            "type": "Uninformed (Cost-Optimal)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    if source == target:
        coords = [[node_coords[source]["lat"], node_coords[source]["lng"]]] if source in node_coords else []
        return {
            "algorithm": "UCS",
            "name": "Uniform Cost Search (Dijkstra)",
            "type": "Uninformed (Cost-Optimal)",
            "path": [source],
            "coordinates": coords,
            "segments": [],
            "visited_node_sequence": coords,
            "total_cost": 0.0,
            "nodes_expanded": 1,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 1,
            "success": True
        }

    pq = [(0.0, 0, source)]
    dist = {source: 0.0}
    parent = {source: None}
    visited = set()
    found = False
    counter = 0

    while pq:
        cost, _, u = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1
        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u == target:
            found = True
            break

        for v, edge_data in graph[u].items():
            if edge_data.get("blocked", False):
                continue
            edge_cost = edge_data.get("cost", edge_data.get("length", 1.0))
            new_cost = cost + edge_cost

            if new_cost < dist.get(v, float('inf')):
                dist[v] = new_cost
                parent[v] = u
                counter += 1
                heapq.heappush(pq, (new_cost, counter, v))

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": "UCS",
            "name": "Uniform Cost Search (Dijkstra)",
            "type": "Uninformed (Cost-Optimal)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = round(dist[target], 2)

    return {
        "algorithm": "UCS",
        "name": "Uniform Cost Search (Dijkstra)",
        "type": "Uninformed (Cost-Optimal)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": True
    }

# ==============================================================================
# 3. A* Search (A*) & 4. Weighted A*
# ==============================================================================
def astar_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_speed_mps: float = 33.33,
    weight: float = 1.0,
    alg_label: str = "A*",
    alg_name: str = "A* Search"
) -> Dict[str, Any]:
    """A* / Weighted A* Search: Informed with admissible Haversine heuristic."""
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": alg_label,
            "name": alg_name,
            "type": "Informed (Admissible Heuristic)" if weight <= 1.0 else "Informed (Heuristic Inflation)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    if source == target:
        coords = [[node_coords[source]["lat"], node_coords[source]["lng"]]] if source in node_coords else []
        return {
            "algorithm": alg_label,
            "name": alg_name,
            "type": "Informed (Admissible Heuristic)" if weight <= 1.0 else "Informed (Heuristic Inflation)",
            "path": [source],
            "coordinates": coords,
            "segments": [],
            "visited_node_sequence": coords,
            "total_cost": 0.0,
            "nodes_expanded": 1,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 1,
            "success": True
        }

    target_coord = node_coords.get(target)
    if not target_coord:
        return {
            "algorithm": alg_label,
            "name": alg_name,
            "type": "Informed",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    def heuristic(n: int) -> float:
        coord = node_coords.get(n)
        if not coord:
            return 0.0
        dist_m = haversine_distance(coord["lat"], coord["lng"], target_coord["lat"], target_coord["lng"])
        return dist_m / max(max_speed_mps, 1.0)

    h_start = heuristic(source)
    pq = [(weight * h_start, 0.0, 0, source)]
    g_score = {source: 0.0}
    parent = {source: None}
    visited = set()
    found = False
    counter = 0

    while pq:
        f, g, _, u = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1
        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u == target:
            found = True
            break

        for v, edge_data in graph[u].items():
            if edge_data.get("blocked", False):
                continue
            edge_cost = edge_data.get("cost", edge_data.get("length", 1.0))
            tentative_g = g + edge_cost

            if tentative_g < g_score.get(v, float('inf')):
                g_score[v] = tentative_g
                parent[v] = u
                h_val = heuristic(v)
                f_val = tentative_g + weight * h_val
                counter += 1
                heapq.heappush(pq, (f_val, tentative_g, counter, v))

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": alg_label,
            "name": alg_name,
            "type": "Informed (Admissible Heuristic)" if weight <= 1.0 else "Informed (Heuristic Inflation)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = round(g_score[target], 2)

    return {
        "algorithm": alg_label,
        "name": alg_name,
        "type": "Informed (Admissible Heuristic)" if weight <= 1.0 else f"Informed (w={weight} Inflation)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": True
    }

def weighted_astar_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_speed_mps: float = 33.33,
    weight: float = 1.6
) -> Dict[str, Any]:
    """Weighted A* Search with heuristic inflation factor w > 1.0."""
    return astar_search(
        graph=graph,
        source=source,
        target=target,
        node_coords=node_coords,
        max_speed_mps=max_speed_mps,
        weight=weight,
        alg_label="Weighted A*",
        alg_name=f"Weighted A* (w={weight})"
    )

# ==============================================================================
# 5. Greedy Best-First Search (GBFS)
# ==============================================================================
def gbfs_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_speed_mps: float = 33.33
) -> Dict[str, Any]:
    """
    Greedy Best-First Search (GBFS): Informed.
    Priority queue sorted ONLY by heuristic h(n) (straight-line distance to goal).
    Fastest greedy guidance, trades path optimality for speed.
    """
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": "GBFS",
            "name": "Greedy Best-First Search",
            "type": "Informed (Pure Heuristic)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    target_coord = node_coords.get(target)
    if not target_coord:
        return {
            "algorithm": "GBFS",
            "name": "Greedy Best-First Search",
            "type": "Informed (Pure Heuristic)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    def heuristic(n: int) -> float:
        coord = node_coords.get(n)
        if not coord:
            return 0.0
        return haversine_distance(coord["lat"], coord["lng"], target_coord["lat"], target_coord["lng"]) / max(max_speed_mps, 1.0)

    pq = [(heuristic(source), 0, source)]
    visited = set()
    parent = {source: None}
    found = False
    counter = 0

    while pq:
        h, _, u = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1
        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u == target:
            found = True
            break

        for v, edge_data in graph[u].items():
            if edge_data.get("blocked", False):
                continue
            if v not in visited:
                parent[v] = u
                counter += 1
                heapq.heappush(pq, (heuristic(v), counter, v))

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": "GBFS",
            "name": "Greedy Best-First Search",
            "type": "Informed (Pure Heuristic)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = calculate_path_cost(graph, path)

    return {
        "algorithm": "GBFS",
        "name": "Greedy Best-First Search",
        "type": "Informed (Pure Heuristic)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": len(path) > 0
    }

# ==============================================================================
# 6. Depth-First Search (DFS)
# ==============================================================================
def dfs_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_expansions: int = 50000
) -> Dict[str, Any]:
    """
    Depth-First Search (DFS): Uninformed. Uses a LIFO stack.
    - Stack-based iterative implementation to avoid recursion limits.
    - Cycle detection with a visited set.
    - Path reconstruction using parent_map traced backwards from target to source.
    - Visited sequence: appends the node EVERY TIME it is popped from the stack.
    """
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": "DFS",
            "name": "Depth-First Search",
            "type": "Uninformed (Deep Exploration)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    if source == target:
        coords = [[node_coords[source]["lat"], node_coords[source]["lng"]]] if source in node_coords else []
        return {
            "algorithm": "DFS",
            "name": "Depth-First Search",
            "type": "Uninformed (Deep Exploration)",
            "path": [source],
            "coordinates": coords,
            "segments": [],
            "visited_node_sequence": coords,
            "total_cost": 0.0,
            "nodes_expanded": 1,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 1,
            "success": True
        }

    stack = [source]
    visited = set()
    parent = {source: None}
    found = False

    while stack and nodes_expanded < max_expansions:
        u = stack.pop()

        # Visited sequence: append every time it is popped from the stack
        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1

        if u == target:
            found = True
            break

        for v, edge_data in graph[u].items():
            if edge_data.get("blocked", False):
                continue
            if v not in visited:
                parent[v] = u
                stack.append(v)

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": "DFS",
            "name": "Depth-First Search",
            "type": "Uninformed (Deep Exploration)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = calculate_path_cost(graph, path)

    return {
        "algorithm": "DFS",
        "name": "Depth-First Search",
        "type": "Uninformed (Deep Exploration)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": len(path) > 0
    }

# ==============================================================================
# 7. Depth-Limited Search (DLS)
# ==============================================================================
def dls_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    depth_limit: int = 5000,
    max_expansions: int = 50000
) -> Dict[str, Any]:
    """
    Depth-Limited Search (DLS): Uninformed.
    - Stack-based iterative DFS that strictly bounds exploration up to depth_limit.
    - Cycle detection with visited set.
    - Path reconstruction from parent_map.
    - Visited sequence appended on every stack pop.
    """
    start_time = time.perf_counter()
    nodes_expanded = 0
    visited_sequence = []

    if source not in graph or target not in graph:
        return {
            "algorithm": "DLS",
            "name": f"Depth-Limited Search (L={depth_limit})",
            "type": "Uninformed (Depth Cutoff)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": [],
            "total_cost": 0.0,
            "nodes_expanded": 0,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 0,
            "success": False
        }

    if source == target:
        coords = [[node_coords[source]["lat"], node_coords[source]["lng"]]] if source in node_coords else []
        return {
            "algorithm": "DLS",
            "name": f"Depth-Limited Search (L={depth_limit})",
            "type": "Uninformed (Depth Cutoff)",
            "path": [source],
            "coordinates": coords,
            "segments": [],
            "visited_node_sequence": coords,
            "total_cost": 0.0,
            "nodes_expanded": 1,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 3),
            "hops": 1,
            "success": True
        }

    stack = [(source, 0)]
    visited = set()
    parent = {source: None}
    found = False

    while stack and nodes_expanded < max_expansions:
        u, depth = stack.pop()

        if u in node_coords:
            visited_sequence.append([node_coords[u]["lat"], node_coords[u]["lng"]])

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1

        if u == target:
            found = True
            break

        if depth < depth_limit:
            for v, edge_data in graph[u].items():
                if edge_data.get("blocked", False):
                    continue
                if v not in visited:
                    parent[v] = u
                    stack.append((v, depth + 1))

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": "DLS",
            "name": f"Depth-Limited Search (L={depth_limit})",
            "type": "Uninformed (Depth Cutoff)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(visited_sequence),
            "total_cost": 0.0,
            "nodes_expanded": nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, parent, source, target, node_coords)
    total_cost = calculate_path_cost(graph, path)

    return {
        "algorithm": "DLS",
        "name": f"Depth-Limited Search (L={depth_limit})",
        "type": "Uninformed (Depth Cutoff)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(visited_sequence),
        "total_cost": total_cost,
        "nodes_expanded": nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": len(path) > 0
    }

# ==============================================================================
# 8. Iterative Deepening Search (IDS)
# ==============================================================================
def ids_search(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_depth: int = 5000,
    step: int = 50,
    max_expansions: int = 60000
) -> Dict[str, Any]:
    """
    Iterative Deepening Search (IDS): Uninformed.
    - Repeatedly executes depth-limited search with increasing depth bounds.
    - Returns the visited sequence and parent map of the final successful iteration.
    """
    start_time = time.perf_counter()
    total_nodes_expanded = 0
    found = False
    final_parent = {}
    successful_visited_seq = []

    for limit in range(step, max_depth + 1, step):
        stack = [(source, 0)]
        visited = set()
        parent = {source: None}
        iter_seq = []

        while stack and total_nodes_expanded < max_expansions:
            u, depth = stack.pop()
            total_nodes_expanded += 1
            if u in node_coords:
                iter_seq.append([node_coords[u]["lat"], node_coords[u]["lng"]])

            if u in visited:
                continue
            visited.add(u)

            if u == target:
                final_parent = parent
                successful_visited_seq = iter_seq
                found = True
                break

            if depth < limit:
                for v, edge_data in graph[u].items():
                    if edge_data.get("blocked", False):
                        continue
                    if v not in visited:
                        parent[v] = u
                        stack.append((v, depth + 1))

        if found:
            break

    exec_time = round((time.perf_counter() - start_time) * 1000, 3)

    if not found:
        return {
            "algorithm": "IDS",
            "name": "Iterative Deepening Search",
            "type": "Uninformed (Iterative Limits)",
            "path": [],
            "coordinates": [],
            "segments": [],
            "visited_node_sequence": sample_visited_sequence(successful_visited_seq),
            "total_cost": 0.0,
            "nodes_expanded": total_nodes_expanded,
            "execution_time_ms": exec_time,
            "hops": 0,
            "success": False
        }

    path, coordinates, segments = extract_path_and_segments(graph, final_parent, source, target, node_coords)
    total_cost = calculate_path_cost(graph, path)

    return {
        "algorithm": "IDS",
        "name": "Iterative Deepening Search",
        "type": "Uninformed (Iterative Limits)",
        "path": path,
        "coordinates": coordinates,
        "segments": segments,
        "visited_node_sequence": sample_visited_sequence(successful_visited_seq),
        "total_cost": total_cost,
        "nodes_expanded": total_nodes_expanded,
        "execution_time_ms": exec_time,
        "hops": len(path),
        "success": len(path) > 0
    }

# ==============================================================================
# Unified Runner: Run All 8 Algorithms
# ==============================================================================
def run_all_algorithms(
    graph,
    source: int,
    target: int,
    node_coords: Dict[int, Dict[str, float]],
    max_speed_mps: float = 33.33,
    weight: float = 1.6
) -> Dict[str, Dict[str, Any]]:
    """Runs all 8 algorithms on the given graph and returns dictionary of results."""
    bfs_res = bfs_search(graph, source, target, node_coords)
    ucs_res = ucs_search(graph, source, target, node_coords)
    astar_res = astar_search(graph, source, target, node_coords, max_speed_mps=max_speed_mps, weight=1.0)
    w_astar_res = weighted_astar_search(graph, source, target, node_coords, max_speed_mps=max_speed_mps, weight=weight)
    gbfs_res = gbfs_search(graph, source, target, node_coords, max_speed_mps=max_speed_mps)
    dfs_res = dfs_search(graph, source, target, node_coords)
    dls_res = dls_search(graph, source, target, node_coords, depth_limit=5000)
    ids_res = ids_search(graph, source, target, node_coords, step=200, max_depth=5000, max_expansions=120000)

    return {
        "A*": astar_res,
        "Weighted A*": w_astar_res,
        "UCS": ucs_res,
        "GBFS": gbfs_res,
        "BFS": bfs_res,
        "DFS": dfs_res,
        "DLS": dls_res,
        "IDS": ids_res
    }
