# Implementation Plan: Route Intelligence Center (PRD v2.1)

**Objective:** Upgrade Cloud-Trucks Scout from v1.5 (text-based conditions) to v2.1 (interactive geospatial intelligence).

**Current State:** Functional load feed with basic weather/chain law data displayed in expandable text panels.

**Target State:** Interactive Mapbox-powered route visualization with risk scoring, ETA-aware weather, and backhaul heatmaps.

---

## Architecture Overview

### Current Architecture (v1.5)
```
┌─────────────────────────────────────┐
│   DashboardFeed Component           │
│   ├─ Load Cards                     │
│   └─ RouteConditionsPanel (Text)    │
│      ├─ Weather API (Open-Meteo)    │
│      └─ Chain Laws API              │
└─────────────────────────────────────┘
```

### Target Architecture (v2.1)
```
┌─────────────────────────────────────────────────┐
│   DashboardFeed Component                       │
│   ├─ Load Cards                                 │
│   │  └─ "Route Scan" Button                     │
│   │     └─ Opens MapboxIntelligenceModal        │
│   │                                              │
│   └─ MapboxIntelligenceModal (NEW)              │
│      ├─ Mapbox GL JS Instance                   │
│      ├─ Route Polyline (Gradient by Profit)     │
│      ├─ Risk Score Header (1-10)                │
│      ├─ Hazard Markers (SVG Icons)              │
│      ├─ Interactive Click → ETA Weather         │
│      └─ Destination Heatmap Layer               │
│                                                  │
│   Web Worker: ProfitCalculator (NEW)            │
│   └─ ProjectedNet = Net - (DelayHours * $50)    │
└─────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Dependencies & Environment)

### 1.1 Install Dependencies
```bash
npm install mapbox-gl @types/mapbox-gl framer-motion
```

**Why:**
- `mapbox-gl`: Core mapping library for route visualization
- `@types/mapbox-gl`: TypeScript definitions
- `framer-motion`: Modal animations (PRD specifies Framer Motion)

### 1.2 Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

**Why:** FR-4 requires secure token injection via environment variables.

---

## Phase 2: Core Components

### 2.1 Create MapboxIntelligenceModal Component
**File:** `src/components/mapbox-intelligence-modal.tsx`

**Responsibilities:**
1. Initialize Mapbox GL JS instance on mount
2. Fetch route polyline from Mapbox Directions API
3. Render polyline with gradient based on profit density
4. Display Risk Score (1-10) in header
5. Cleanup `map.remove()` on unmount (memory management)

**Key Props:**
```typescript
interface MapboxIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: SavedLoad;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
}
```

### 2.2 Create ProfitCalculator Web Worker
**File:** `src/workers/profit-calculator.ts`

**Purpose:** Offload heavy calculations to prevent UI jank (60fps requirement).

**Logic:**
```typescript
// Input: route coordinates, weather data, load details
// Output: { projectedNet, riskScore, hazardPoints }

function calculateProjectedNet(net: number, delayHours: number): number {
  return net - (delayHours * 50); // FR-5
}

function calculateRiskScore(hazards: Hazard[]): number {
  // 1-10 scale based on hazard density
  // Ice = 3 points, Wind = 2 points, Storm = 4 points
  const totalRisk = hazards.reduce((sum, h) => sum + h.severity, 0);
  return Math.min(10, Math.ceil(totalRisk / 3));
}
```

### 2.3 Integrate Route Scan Button
**File:** `src/components/dashboard-feed.tsx`

**Changes:**
1. Add "Route Scan" button to each Load Card
2. Store selected load in state
3. Open modal on click
4. Pass load coordinates to modal

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setSelectedLoadForMap(load)}
  className="gap-2"
>
  <MapPin className="h-4 w-4" />
  Route Scan
</Button>
```

---

## Phase 3: Mapbox Layers

### 3.1 Route Polyline with Gradient
**API:** Mapbox Directions API
**Endpoint:** `https://api.mapbox.com/directions/v5/mapbox/driving/{origin};{dest}`

**Gradient Logic:**
- Green: High profit density (>$2.50/mi)
- Yellow: Medium ($1.50-$2.50/mi)
- Red: Low (<$1.50/mi)

**Caching (FR-6):**
```typescript
const routeCache = new Map<string, RouteData>();
const cacheKey = `${originLat},${originLon}-${destLat},${destLon}`;
const TTL = 3600000; // 1 hour
```

### 3.2 Hazard Markers (US-005)
**Data Source:** OpenWeather / NOAA API (already integrated)

**Marker Types:**
- ❄️ Ice: Temperature < 32°F + precipitation
- 💨 Wind: Wind speed > 35mph
- ⛈️ Storm: Severe weather alerts

**Placement:** Along polyline at 50-mile intervals

### 3.3 Interactive ETA Weather (US-006)
**Click Handler:**
```typescript
map.on('click', 'route-polyline', (e) => {
  const clickedCoord = e.lngLat;
  const distanceToPoint = calculateDistance(origin, clickedCoord);
  const eta = startTime + (distanceToPoint / 65); // 65mph average
  
  fetchWeatherAtTime(clickedCoord, eta).then(weather => {
    showPopup(clickedCoord, `Weather at ${eta}: ${weather.description}`);
  });
});
```

### 3.4 Destination Heatmap (US-007)
**Data Source:** Historical load volume from `found_loads` table

**Query:**
```sql
SELECT dest_city, dest_state, COUNT(*) as volume
FROM found_loads
WHERE dest_lat BETWEEN ? AND ?
  AND dest_lon BETWEEN ? AND ?
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY dest_city, dest_state
```

**Heatmap Layer:**
```typescript
map.addLayer({
  id: 'backhaul-heatmap',
  type: 'heatmap',
  source: 'load-density',
  paint: {
    'heatmap-weight': ['get', 'volume'],
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(255,0,0,0)',      // Dead Zone (Red)
      0.5, 'rgba(255,255,0,0.5)', // Medium (Yellow)
      1, 'rgba(0,255,0,1)'        // High Volume (Green)
    ]
  }
});
```

---

## Phase 4: Risk Scoring System

### Risk Score Calculation (1-10 Scale)
**Inputs:**
1. Weather hazards (ice, wind, storm)
2. Chain law status (R1=2pts, R2=4pts, R3=6pts)
3. Road conditions (if available)

**Formula:**
```typescript
function calculateRiskScore(data: RouteData): number {
  let score = 0;
  
  // Weather hazards
  score += data.hazards.filter(h => h.type === 'ice').length * 3;
  score += data.hazards.filter(h => h.type === 'wind').length * 2;
  score += data.hazards.filter(h => h.type === 'storm').length * 4;
  
  // Chain laws
  const activeChainLaws = data.chainLaws.filter(l => l.isActive);
  score += activeChainLaws.filter(l => l.status === 'r1').length * 2;
  score += activeChainLaws.filter(l => l.status === 'r2').length * 4;
  score += activeChainLaws.filter(l => l.status === 'r3').length * 6;
  
  return Math.min(10, Math.ceil(score / 3));
}
```

**Display:**
```tsx
<div className="flex items-center gap-2">
  <Badge variant={riskScore > 7 ? 'destructive' : riskScore > 4 ? 'warning' : 'success'}>
    Risk Score: {riskScore}/10
  </Badge>
</div>
```

---

## Phase 5: Performance Optimization

### 5.1 Web Worker Integration
**Why:** PRD requires 60fps UI performance during profit calculations.

**Implementation:**
```typescript
// Main thread
const worker = new Worker('/workers/profit-calculator.js');
worker.postMessage({ route, weather, load });
worker.onmessage = (e) => {
  setProjectedNet(e.data.projectedNet);
  setRiskScore(e.data.riskScore);
};
```

### 5.2 Route Caching (FR-6)
**Cache Structure:**
```typescript
interface CachedRoute {
  polyline: GeoJSON.LineString;
  timestamp: number;
  projectedNet: number;
  riskScore: number;
}
```

**Eviction:** 1-hour TTL, LRU policy

---

## Phase 6: Testing & Validation

### 6.1 Manual Testing Checklist
- [ ] Modal opens on "Route Scan" click
- [ ] Polyline renders with correct gradient
- [ ] Risk score displays (1-10)
- [ ] Hazard markers appear at correct locations
- [ ] Click on polyline shows ETA weather
- [ ] Heatmap shows at destination
- [ ] Modal closes and cleans up map instance
- [ ] No memory leaks after 10 open/close cycles

### 6.2 Performance Validation
- [ ] UI remains at 60fps during calculations
- [ ] Route cache reduces API calls by >80%
- [ ] Worker thread handles calculations without blocking

---

## Migration Strategy

### Backward Compatibility
- Keep existing `RouteConditionsPanel` as fallback
- Add feature flag: `NEXT_PUBLIC_ENABLE_MAP_INTELLIGENCE=true`
- Graceful degradation if Mapbox token is missing

### Rollout Plan
1. **Week 1:** Install dependencies, create modal shell
2. **Week 2:** Implement polyline and risk scoring
3. **Week 3:** Add interactive features (ETA, heatmap)
4. **Week 4:** Performance optimization and testing

---

## Why These Changes?

### Strategic Rationale
1. **Competitive Advantage:** Interactive maps provide 10x better spatial awareness than text panels
2. **Risk Mitigation:** Visual hazard overlay prevents costly mistakes (ice storms, chain control violations)
3. **Backhaul Optimization:** Heatmap eliminates "dead zone" guesswork, increasing revenue per mile
4. **User Experience:** Drivers trust what they can see; maps > text

### Technical Rationale
1. **Mapbox GL JS:** Industry standard, 60fps performance, offline caching
2. **Web Workers:** Prevents UI jank during heavy calculations
3. **Gradient Polylines:** Instant visual profit assessment
4. **1-hour Cache:** Balances freshness with API cost reduction

---

## Non-Goals (Per PRD)
- ❌ Turn-by-turn voice navigation
- ❌ Live GPS tracking
- ❌ Real-time traffic integration (future consideration)

---

## Success Metrics
1. **Adoption:** >70% of users click "Route Scan" within first week
2. **Performance:** Modal load time <500ms
3. **Accuracy:** Risk score correlates with actual delays (validate via feedback)
4. **API Cost:** <$50/month Mapbox API usage

---

## Dependencies & Risks

### External Dependencies
- Mapbox Directions API (rate limits: 300 req/min)
- OpenWeather API (existing)
- NOAA API (existing)

### Technical Risks
1. **Mapbox Token Security:** Mitigated by domain restrictions
2. **API Rate Limits:** Mitigated by 1-hour caching
3. **Browser Compatibility:** Mapbox requires WebGL (>95% coverage)

### Mitigation Strategies
- Implement exponential backoff for API failures
- Add loading states and error boundaries
- Provide text fallback for non-WebGL browsers
