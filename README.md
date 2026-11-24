# 🗺️ Route Planning & Algorithm Comparison Lab (Dhaka City Edition)

An interactive full-stack laboratory application comparing fundamental uninformed and heuristic informed search algorithms on a large-scale real-world urban street network for **Dhaka, Bangladesh (25,270 nodes, 62,634 directed edges)**.

Built with **FastAPI (Python)** on the backend and **React + Leaflet + Tailwind CSS + TypeScript (Vite)** on the frontend.

---

## 🚀 Key Features & Highlights

### 1. 8 Search Algorithms Implemented From Scratch
All algorithms are explicitly implemented in Python (`backend/algorithms.py`) with cycle checking, path reconstruction, and visited node sequence telemetry:
* **A\* Search**: Informed, provably cost-optimal using admissible Haversine straight-line distance divided by maximum speed limit ($h(n) \le h^*(n)$).
* **Weighted A\* ($w=1.6$)**: Informed, trades slight optimality for drastically faster exploration by inflating the heuristic.
* **Uniform Cost Search (UCS / Dijkstra)**: Uninformed, guaranteed cost-optimal traversal based on cumulative edge traversal weights.
* **Greedy Best-First Search (GBFS)**: Informed, expands nodes purely prioritized by $h(n)$ straight-line distance to goal.
* **Breadth-First Search (BFS)**: Uninformed, minimizes intersection count (hops) level-by-level, ignoring travel times.
* **Depth-First Search (DFS)**: Uninformed, stack-based with cycle detection and backtracking.
* **Depth-Limited Search (DLS)**: Uninformed, DFS strictly bounded by a maximum depth threshold.
* **Iterative Deepening Search (IDS)**: Uninformed, combines BFS completeness with DFS low memory overhead.

### 2. Step-by-Step Canvas Exploration Animation
* Progressively animates the search frontier as blue dots across Dhaka city streets.
* **Direct Leaflet Canvas Rendering**: Zero React VDOM reconciliation overhead, ensuring 60 FPS panning and zooming even with 10,000+ explored nodes.
* **Animation Controls**: Play, Pause, Reset, Skip to End, and a live speed slider (from 200ms pause per step down to 1ms rapid exploration).
* **Delayed Path Reveal**: The final route (bold red line) is revealed only after the exploration animation completes (or upon skipping).

### 3. Dynamic Real-World Constraint Modeling & Global Rerouting
Supports 6 dynamic semantic scenarios:
- ⛔ **Road Block**: Full road closure ($cost = \infty$)
- 🚗 **Traffic Jam**: Up to $5.0\times$ traversal delay
- 🚧 **Road Construction**: Moderate delay + hazard penalty
- 🔥 **Fire Emergency**: Complete road closure + safety perimeter cordon on neighboring intersections
- 💥 **Road Accident**: Multi-vehicle collision delay
- 🌙 **Late Night Risk**: Safety penalty on unlit secondary corridors

When constraints are applied, the system performs a **Global Recalculation** from Source to Target, displaying the baseline route, the new detour route, and highlighted modified edges.

### 4. Location-Based Routing (Search by Names)
* Search or select popular Dhaka hubs: **Dhanmondi, Mirpur 10, Gulshan 1, Gulshan 2, Banani, Shahbagh, Motijheel, Farmgate, Uttara, Mohakhali, Karwan Bazar, Agargaon, Mohammadpur**, etc.
* Spatial lookups powered by `scipy.spatial.KDTree` finding the nearest graph intersection in $< 0.1\text{ms}$.
* 1-click **Swap Direction** button.

### 5. Free, Keyless OpenStreetMap Tiles
* Official standard OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
* 100% free with no API keys, quotas, or rate-limit watermarks.

---

## 📊 Telemetry Benchmarking (Dhanmondi → Mirpur 10)

| Algorithm | Type | Cost (s) | Hops | Nodes Expanded | Runtime | Optimality |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **A\*** | Informed | $763.7\text{s}$ | $86$ | $4,643$ | $\approx 35\text{ms}$ | 🏆 Cost-Optimal ($67\%$ pruned vs UCS) |
| **Weighted A\*** | Informed | $763.7\text{s}$ | $86$ | **$1,573$** | **$\approx 12\text{ms}$** | ⚡ Fast & Optimal ($66\%$ fewer than A\*) |
| **UCS (Dijkstra)**| Uninformed | $763.7\text{s}$ | $86$ | $14,241$ | $\approx 90\text{ms}$ | 🏆 Cost-Optimal (concentric search) |
| **GBFS** | Informed | $1282.8\text{s}$ | $147$ | **$173$** | **$\approx 1\text{ms}$** | ⚠️ Sub-optimal (+$68\%$ time delay) |
| **BFS** | Uninformed | $1143.0\text{s}$ | **$80$** | $21,804$ | $\approx 95\text{ms}$ | 🎯 Hop-Optimal (ignores road speeds) |
| **DFS** | Uninformed | $4753.3\text{s}$ | $4642$ | $8,429$ | $\approx 65\text{ms}$ | 🌀 Wandering (cycle-checked) |
| **DLS** | Uninformed | $4753.3\text{s}$ | $4642$ | $8,429$ | $\approx 65\text{ms}$ | 🛑 Depth-bounded |
| **IDS** | Uninformed | $374.5\text{s}$ | $601$ | $10,373$ | $\approx 130\text{ms}$ | 🔄 Iterative deepening levels |

---

## 🛠️ Project Structure

```
├── backend/
│   ├── algorithms.py       # BFS, UCS, A*, Weighted A*, GBFS, DFS, DLS, IDS
│   ├── graph_loader.py     # OSMnx graph extraction, KDTree, constraints
│   ├── main.py             # FastAPI routes, presets, telemetry summary
│   ├── requirements.txt    # Python dependencies
│   └── cache/              # Cached Dhaka road network (.graphml)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapContainer.tsx     # Leaflet map, canvas animation, zoom controls
│   │   │   ├── Sidebar.tsx          # Floating GIS controls, animation player, metrics
│   │   │   ├── ConstraintModal.tsx  # Dynamic road constraint presets
│   │   │   ├── ComparisonModal.tsx  # Side-by-side benchmark table & charts
│   │   │   └── RouteInspector.tsx   # Segment carousel & quick-block
│   │   ├── types.ts                 # TypeScript interfaces & algorithm metadata
│   │   └── App.tsx                  # Application state & routing orchestration
│   ├── package.json
│   └── vite.config.ts
├── start.sh                # One-click startup script
└── README.md
```

---

## ⚡ How to Run

### Option 1: One-Click Startup Script (Recommended)
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Running in Separate Terminals

#### 1. Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Interactive Backend Swagger API**: `http://localhost:8000/docs`
