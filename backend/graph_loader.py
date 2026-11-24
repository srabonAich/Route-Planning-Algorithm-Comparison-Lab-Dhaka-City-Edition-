import os
import math
import logging
from typing import Dict, List, Any, Tuple, Optional
import networkx as nx
import numpy as np
from scipy.spatial import KDTree

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
DHAKA_GRAPHML_PATH = os.path.join(CACHE_DIR, "dhaka_drive_network.graphml")
LEGACY_GRAPHML_PATH = os.path.join(CACHE_DIR, "graph.graphml")

# Bounding box for Dhaka urban core (west, south, east, north)
# Covers Uttara down to Sadarghat/Old Dhaka, Gabtoli/Mirpur to Badda/Motijheel
DHAKA_BBOX = (90.34, 23.70, 90.44, 23.86)

# Canonical list of prominent Dhaka hubs and neighborhoods
POPULAR_LOCATIONS: Dict[str, Dict[str, Any]] = {
    "Dhanmondi": {
        "name": "Dhanmondi",
        "lat": 23.7461,
        "lng": 90.3742,
        "description": "Residential & cultural hub, Lake, Rd 27/32"
    },
    "Mirpur 10": {
        "name": "Mirpur 10",
        "lat": 23.8069,
        "lng": 90.3687,
        "description": "Major metro interchange & transit roundabout"
    },
    "Mirpur 1": {
        "name": "Mirpur 1",
        "lat": 23.7956,
        "lng": 90.3537,
        "description": "Commerce, National Zoo & Botanical Garden"
    },
    "Gulshan 1": {
        "name": "Gulshan 1",
        "lat": 23.7785,
        "lng": 90.4172,
        "description": "Diplomatic & commercial center (South)"
    },
    "Gulshan 2": {
        "name": "Gulshan 2",
        "lat": 23.7925,
        "lng": 90.4150,
        "description": "Corporate headquarters, embassies (North)"
    },
    "Banani": {
        "name": "Banani",
        "lat": 23.7937,
        "lng": 90.4043,
        "description": "High-end commercial & dining district"
    },
    "Shahbagh": {
        "name": "Shahbagh",
        "lat": 23.7383,
        "lng": 90.3958,
        "description": "BSMMU, National Museum, central junction"
    },
    "Motijheel": {
        "name": "Motijheel",
        "lat": 23.7329,
        "lng": 90.4173,
        "description": "Central Business District & financial heart"
    },
    "Farmgate": {
        "name": "Farmgate",
        "lat": 23.7570,
        "lng": 90.3887,
        "description": "Major central transit bottleneck & elevated expressway"
    },
    "Uttara": {
        "name": "Uttara",
        "lat": 23.8744,
        "lng": 90.3980,
        "description": "Northern gateway, airport corridor (House Building)"
    },
    "Mohakhali": {
        "name": "Mohakhali",
        "lat": 23.7776,
        "lng": 90.4054,
        "description": "Inter-district bus terminal & flyover junction"
    },
    "Karwan Bazar": {
        "name": "Karwan Bazar",
        "lat": 23.7515,
        "lng": 90.3934,
        "description": "Wholesale market & media hub"
    },
    "Bijoy Sarani": {
        "name": "Bijoy Sarani",
        "lat": 23.7661,
        "lng": 90.3871,
        "description": "Military Museum, Rangs Bhaban intersection"
    },
    "Agargaon": {
        "name": "Agargaon",
        "lat": 23.7778,
        "lng": 90.3770,
        "description": "Administrative zone & Metro Line 6 station"
    },
    "Mohammadpur": {
        "name": "Mohammadpur",
        "lat": 23.7658,
        "lng": 90.3585,
        "description": "Town Hall, Ring Road & Beribadh corridor"
    },
    "Dhaka University (TSC)": {
        "name": "Dhaka University (TSC)",
        "lat": 23.7330,
        "lng": 90.3950,
        "description": "Historic university campus & Shaheed Minar"
    },
    "Bashundhara R/A": {
        "name": "Bashundhara R/A",
        "lat": 23.8150,
        "lng": 90.4280,
        "description": "North South Univ, Jamuna Future Park corridor"
    },
    "Old Dhaka (Sadarghat)": {
        "name": "Old Dhaka (Sadarghat)",
        "lat": 23.7050,
        "lng": 90.4110,
        "description": "Buriganga river port & historic district"
    },
    "Rampura": {
        "name": "Rampura",
        "lat": 23.7610,
        "lng": 90.4210,
        "description": "Hatirjheel eastern gateway & DIT road"
    },
    "Malibagh": {
        "name": "Malibagh",
        "lat": 23.7480,
        "lng": 90.4130,
        "description": "Major flyover hub connecting central & eastern Dhaka"
    }
}

def parse_speed_kph(maxspeed_val: Any, highway_type: Any = None) -> float:
    """Parse speed limit from OSM tag or infer from highway classification."""
    default_speed = 35.0  # km/h
    if isinstance(maxspeed_val, list):
        maxspeed_val = maxspeed_val[0] if maxspeed_val else None

    if isinstance(maxspeed_val, str):
        val = maxspeed_val.lower().strip()
        if 'mph' in val:
            try:
                mph = float(val.replace('mph', '').strip())
                return round(mph * 1.60934, 1)
            except ValueError:
                pass
        elif 'kph' in val or 'km/h' in val:
            try:
                return float(val.replace('km/h', '').replace('kph', '').strip())
            except ValueError:
                pass
        else:
            try:
                return float(val)
            except ValueError:
                pass

    if highway_type:
        hw = str(highway_type).lower()
        if 'motorway' in hw or 'trunk' in hw:
            return 55.0
        elif 'primary' in hw:
            return 45.0
        elif 'secondary' in hw:
            return 35.0
        elif 'tertiary' in hw:
            return 30.0
        elif 'residential' in hw or 'living_street' in hw:
            return 20.0

    return default_speed

def calculate_edge_cost(
    length: float, 
    speed_kph: float, 
    traffic_factor: float = 1.0, 
    safety_penalty: float = 0.0, 
    blocked: bool = False
) -> float:
    """
    Cost formula:
    If blocked: cost = infinity
    Else: cost = (length / (speed_kph * (1000 / 3600)) * traffic_factor) + safety_penalty
    """
    if blocked:
        return float('inf')
    speed_mps = max(speed_kph * (1000.0 / 3600.0), 0.5)
    travel_time = (length / speed_mps) * max(traffic_factor, 0.1)
    return round(travel_time + max(safety_penalty, 0.0), 3)

class UrbanGraphManager:
    """
    Manages loading, caching, edge attributes, dynamic constraints,
    KDTree nearest node queries, and strongly connected graph conversions for Dhaka.
    """
    def __init__(self):
        self.graph: Optional[nx.DiGraph] = None
        self.raw_graph = None
        self.node_coords: Dict[int, Dict[str, float]] = {}
        self.node_ids_list: List[int] = []
        self.kdtree: Optional[KDTree] = None
        self.bbox: Dict[str, float] = {}
        self.max_speed_kph: float = 45.0
        self.max_speed_mps: float = 45.0 / 3.6
        self.locations_resolved: Dict[str, Dict[str, Any]] = {}

    def load_graph(self) -> nx.DiGraph:
        """Load graph from Dhaka cache, fallback cache, or OSMnx download."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        raw_graph = None

        # 1. Try Dhaka cache
        if os.path.exists(DHAKA_GRAPHML_PATH):
            logger.info("Loading cached Dhaka drive network from %s...", DHAKA_GRAPHML_PATH)
            try:
                import osmnx as ox
                raw_graph = ox.load_graphml(DHAKA_GRAPHML_PATH)
                logger.info("Loaded Dhaka graphml with %d nodes and %d edges.", len(raw_graph.nodes), len(raw_graph.edges))
            except Exception as e:
                logger.warning("Failed loading dhaka_drive_network.graphml: %s", e)

        # 2. Try download if not cached
        if raw_graph is None:
            try:
                import osmnx as ox
                logger.info("Querying OSMnx for central Dhaka road network (5km radius, point=(23.777176, 90.399452))...")
                raw_graph = ox.graph_from_point((23.777176, 90.399452), dist=5000, network_type='drive')
                ox.save_graphml(raw_graph, DHAKA_GRAPHML_PATH)
                logger.info("Successfully downloaded and cached Dhaka graphml (%d nodes, %d edges)!", len(raw_graph.nodes), len(raw_graph.edges))
            except Exception as e:
                logger.warning("OSMnx graph_from_point failed: %s. Checking bounding box or legacy cache...", e)
                try:
                    import osmnx as ox
                    raw_graph = ox.graph_from_bbox(bbox=DHAKA_BBOX, network_type='drive', simplify=True)
                    ox.save_graphml(raw_graph, DHAKA_GRAPHML_PATH)
                except Exception as e2:
                    if os.path.exists(LEGACY_GRAPHML_PATH):
                        import osmnx as ox
                        raw_graph = ox.load_graphml(LEGACY_GRAPHML_PATH)
                    else:
                        raise RuntimeError(f"Unable to load or download road network: {e2}")

        self.raw_graph = raw_graph

        # 3. Convert MultiDiGraph to DiGraph
        D = nx.DiGraph()

        for node_id, data in raw_graph.nodes(data=True):
            n_id = int(node_id)
            lat = float(data.get('y', data.get('lat', 0.0)))
            lng = float(data.get('x', data.get('lon', data.get('lng', 0.0))))
            D.add_node(n_id, lat=lat, lng=lng, **data)

        for u, v, data in raw_graph.edges(data=True):
            u_int = int(u)
            v_int = int(v)
            if u_int == v_int:
                continue

            length = float(data.get('length', 50.0))
            if D.has_edge(u_int, v_int):
                if length < D[u_int][v_int]['length']:
                    D[u_int][v_int].update(data)
                    D[u_int][v_int]['length'] = length
            else:
                D.add_edge(u_int, v_int, **data)
                D[u_int][v_int]['length'] = length

        # 4. Extract largest strongly connected component
        sccs = list(nx.strongly_connected_components(D))
        if sccs:
            largest = max(sccs, key=len)
            D = D.subgraph(largest).copy()

        self.graph = D
        self._post_process_graph()
        self._resolve_popular_locations()
        return self.graph

    def _post_process_graph(self):
        """Build coordinate maps, edge attributes with geometry, bounding box, and KDTree."""
        self.node_coords = {}
        self.node_ids_list = []
        coord_matrix = []
        lats = []
        lngs = []
        max_speed = 35.0

        for n, data in self.graph.nodes(data=True):
            lat = float(data["lat"])
            lng = float(data["lng"])
            self.node_coords[n] = {"lat": lat, "lng": lng}
            self.node_ids_list.append(n)
            coord_matrix.append([lat, lng])
            lats.append(lat)
            lngs.append(lng)

        # Build KDTree for sub-millisecond nearest neighbor lookup
        self.kdtree = KDTree(np.array(coord_matrix))

        self.bbox = {
            "min_lat": min(lats) if lats else 23.70,
            "max_lat": max(lats) if lats else 23.88,
            "min_lng": min(lngs) if lngs else 90.34,
            "max_lng": max(lngs) if lngs else 90.45,
            "center_lat": round((min(lats) + max(lats)) / 2, 6) if lats else 23.78,
            "center_lng": round((min(lngs) + max(lngs)) / 2, 6) if lngs else 90.40
        }

        # Initialize edge costs and properties
        for u, v, data in self.graph.edges(data=True):
            length = float(data.get("length", 50.0))
            maxspeed_raw = data.get("maxspeed")
            highway_raw = data.get("highway")
            speed_kph = parse_speed_kph(maxspeed_raw, highway_raw)
            if speed_kph > max_speed:
                max_speed = speed_kph

            traffic_factor = float(data.get("traffic_factor", 1.0))
            safety_penalty = float(data.get("safety_penalty", 0.0))
            blocked = bool(data.get("blocked", False))
            cost = calculate_edge_cost(length, speed_kph, traffic_factor, safety_penalty, blocked)

            # Extract polyline geometry
            geom_coords = data.get("geometry_coords")
            if geom_coords is None:
                geom = data.get("geometry")
                if geom is not None and hasattr(geom, "coords"):
                    geom_coords = [[round(pt[1], 6), round(pt[0], 6)] for pt in geom.coords]
                else:
                    u_coord = self.node_coords[u]
                    v_coord = self.node_coords[v]
                    geom_coords = [
                        [u_coord["lat"], u_coord["lng"]],
                        [v_coord["lat"], v_coord["lng"]]
                    ]

            name = data.get("name")
            if isinstance(name, list):
                name = name[0]
            name = str(name) if name else f"Road ({u}→{v})"

            edge_attr = {
                "u": u,
                "v": v,
                "length": round(length, 1),
                "speed_kph": round(speed_kph, 1),
                "name": name,
                "traffic_factor": traffic_factor,
                "safety_penalty": safety_penalty,
                "blocked": blocked,
                "cost": cost,
                "geometry_coords": geom_coords
            }
            self.graph[u][v].update(edge_attr)

        self.max_speed_kph = max_speed
        self.max_speed_mps = max_speed * (1000.0 / 3600.0)
        logger.info(
            "Dhaka SCC Graph ready: %d nodes, %d edges, max speed: %.1f km/h", 
            len(self.graph.nodes), len(self.graph.edges), self.max_speed_kph
        )

    def _resolve_popular_locations(self):
        """Map popular Dhaka location coordinates to their nearest SCC nodes."""
        self.locations_resolved = {}
        for key, loc in POPULAR_LOCATIONS.items():
            node_id, nearest_dist = self.get_nearest_node(loc["lat"], loc["lng"])
            node_coord = self.node_coords[node_id]
            self.locations_resolved[key] = {
                "key": key,
                "name": loc["name"],
                "description": loc["description"],
                "lat": loc["lat"],
                "lng": loc["lng"],
                "node_id": node_id,
                "node_lat": node_coord["lat"],
                "node_lng": node_coord["lng"],
                "dist_meters": round(nearest_dist * 111000, 1)
            }

    def get_nearest_node(self, lat: float, lng: float) -> Tuple[int, float]:
        """Find the nearest node in the SCC graph using the KDTree index."""
        if not self.kdtree:
            raise RuntimeError("KDTree is not initialized.")
        dist, idx = self.kdtree.query([lat, lng])
        node_id = self.node_ids_list[idx]
        return node_id, float(dist)

    def resolve_location_query(self, query: str) -> Dict[str, Any]:
        """
        Resolve a user-provided location name to a canonical graph node.
        Supports exact match, fuzzy/substring match, or dynamic geocoding fallback.
        """
        q_norm = query.strip().lower()

        # 1. Exact match in popular locations
        for key, loc in self.locations_resolved.items():
            if q_norm == key.lower():
                return loc

        # 2. Substring match in popular locations
        for key, loc in self.locations_resolved.items():
            if q_norm in key.lower() or key.lower() in q_norm:
                return loc

        # 3. Dynamic Geocoding via OSMnx
        try:
            import osmnx as ox
            geocode_query = f"{query}, Dhaka, Bangladesh" if "dhaka" not in q_norm else query
            logger.info("Attempting OSMnx geocode for '%s'...", geocode_query)
            lat, lng = ox.geocoder.geocode(geocode_query)
            node_id, dist = self.get_nearest_node(lat, lng)
            node_coord = self.node_coords[node_id]
            return {
                "key": query,
                "name": query.title(),
                "description": f"Geocoded location ({lat:.4f}, {lng:.4f})",
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "node_id": node_id,
                "node_lat": node_coord["lat"],
                "node_lng": node_coord["lng"],
                "dist_meters": round(dist * 111000, 1)
            }
        except Exception as e:
            logger.warning("Geocoding failed for '%s': %s. Defaulting to Dhanmondi.", query, e)
            return self.locations_resolved.get("Dhanmondi", list(self.locations_resolved.values())[0])

    def apply_constraints(self, constraints: List[Dict[str, Any]]) -> nx.DiGraph:
        """
        Creates a copy of the graph with user constraints applied.
        Supports standard parameters as well as semantic presets:
        - Road Block: blocked=True
        - Traffic Jam: traffic_factor=3.0
        - Late Night Risk: safety_penalty=50.0
        - Road Construction: traffic_factor=2.0, safety_penalty=10.0
        - Fire Emergency: blocked=True + heavy penalty on immediate neighbor edges
        - Road Accident: traffic_factor=5.0, safety_penalty=20.0
        """
        constrained_graph = self.graph.copy()

        for c in constraints:
            u = int(c.get("u", 0))
            v = int(c.get("v", 0))
            c_type = c.get("constraint_type", "custom")

            traffic_factor = float(c.get("traffic_factor", 1.0))
            safety_penalty = float(c.get("safety_penalty", 0.0))
            blocked = bool(c.get("blocked", False))
            affect_neighbors = bool(c.get("affect_neighbors", False)) or (c_type == "fire")

            # Apply semantic presets if specified
            if c_type == "roadblock":
                blocked = True
            elif c_type == "traffic_jam":
                traffic_factor = max(traffic_factor, 3.0)
            elif c_type == "late_night_risk":
                safety_penalty = max(safety_penalty, 50.0)
            elif c_type == "construction":
                traffic_factor = max(traffic_factor, 2.0)
                safety_penalty = max(safety_penalty, 10.0)
            elif c_type == "fire":
                blocked = True
                affect_neighbors = True
            elif c_type == "accident":
                traffic_factor = max(traffic_factor, 5.0)
                safety_penalty = max(safety_penalty, 20.0)

            # Apply to primary edge (u, v)
            if constrained_graph.has_edge(u, v):
                edge_data = constrained_graph[u][v]
                length = edge_data.get("length", 50.0)
                speed_kph = edge_data.get("speed_kph", 35.0)
                new_cost = calculate_edge_cost(length, speed_kph, traffic_factor, safety_penalty, blocked)

                edge_data["traffic_factor"] = traffic_factor
                edge_data["safety_penalty"] = safety_penalty
                edge_data["blocked"] = blocked
                edge_data["constraint_type"] = c_type
                edge_data["cost"] = new_cost

            # Apply to reverse edge (v, u) if bidirectional
            if constrained_graph.has_edge(v, u) and c.get("bidirectional", True):
                edge_data_rev = constrained_graph[v][u]
                length_rev = edge_data_rev.get("length", 50.0)
                speed_kph_rev = edge_data_rev.get("speed_kph", 35.0)
                new_cost_rev = calculate_edge_cost(length_rev, speed_kph_rev, traffic_factor, safety_penalty, blocked)

                edge_data_rev["traffic_factor"] = traffic_factor
                edge_data_rev["safety_penalty"] = safety_penalty
                edge_data_rev["blocked"] = blocked
                edge_data_rev["constraint_type"] = c_type
                edge_data_rev["cost"] = new_cost_rev

            # Fire Emergency: cordon off and penalize immediate neighbor edges
            if affect_neighbors:
                neighbor_nodes = set()
                # Outgoing & incoming to u
                for nbr in list(constrained_graph.successors(u)) + list(constrained_graph.predecessors(u)):
                    neighbor_nodes.add((u, nbr))
                    neighbor_nodes.add((nbr, u))
                # Outgoing & incoming to v
                for nbr in list(constrained_graph.successors(v)) + list(constrained_graph.predecessors(v)):
                    neighbor_nodes.add((v, nbr))
                    neighbor_nodes.add((nbr, v))

                for n_u, n_v in neighbor_nodes:
                    if (n_u, n_v) in [(u, v), (v, u)]:
                        continue
                    if constrained_graph.has_edge(n_u, n_v):
                        n_data = constrained_graph[n_u][n_v]
                        if not n_data.get("blocked", False):
                            n_len = n_data.get("length", 50.0)
                            n_spd = n_data.get("speed_kph", 30.0)
                            n_tf = max(float(n_data.get("traffic_factor", 1.0)), 3.0)
                            n_sp = float(n_data.get("safety_penalty", 0.0)) + 80.0
                            n_cost = calculate_edge_cost(n_len, n_spd, n_tf, n_sp, False)
                            n_data["traffic_factor"] = n_tf
                            n_data["safety_penalty"] = n_sp
                            n_data["hazard_zone"] = True
                            n_data["cost"] = n_cost

        return constrained_graph

# Global singleton
graph_manager = UrbanGraphManager()
