/**
 * Web Worker: Profit Calculator
 * Purpose: Offload heavy calculations to prevent UI jank (60fps requirement)
 * 
 * Calculations:
 * - ProjectedNet = Net - (DelayHours * $50/hr) [FR-5]
 * - Risk Score (1-10 scale based on hazard density)
 * - Hazard point identification along route
 */

export interface Hazard {
  type: 'ice' | 'wind' | 'storm';
  severity: number; // 1-10
  lat: number;
  lon: number;
  description: string;
}

export interface ChainLaw {
  status: 'none' | 'r1' | 'r2' | 'r3';
  isActive: boolean;
  route_name: string;
}

export interface WeatherPoint {
  lat: number;
  lon: number;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  description: string;
  timestamp: number;
}

export interface RouteData {
  coordinates: [number, number][];
  distance: number; // miles
  duration: number; // hours
  weatherPoints: WeatherPoint[];
  chainLaws: ChainLaw[];
}

export interface LoadDetails {
  rate: number;
  trip_rate?: number;
  distance: number;
  trip_distance_mi?: number;
  pickup_date: string | number;
}

export interface CalculationResult {
  projectedNet: number;
  riskScore: number;
  hazards: Hazard[];
  delayHours: number;
  profitPerMile: number;
}

/**
 * Calculate projected net profit accounting for delays
 * Formula: ProjectedNet = Net - (DelayHours * $50/hr)
 */
export function calculateProjectedNet(
  baseRate: number,
  delayHours: number
): number {
  const delayCost = delayHours * 50; // $50/hr opportunity cost
  return Math.max(0, baseRate - delayCost);
}

/**
 * Calculate delay hours based on weather hazards and chain laws
 */
export function estimateDelayHours(
  hazards: Hazard[],
  chainLaws: ChainLaw[]
): number {
  let delayHours = 0;

  // Weather-based delays
  hazards.forEach((hazard) => {
    switch (hazard.type) {
      case 'ice':
        delayHours += 2; // Ice conditions: 2hr delay per incident
        break;
      case 'storm':
        delayHours += 3; // Severe weather: 3hr delay
        break;
      case 'wind':
        delayHours += 1; // High winds: 1hr delay
        break;
    }
  });

  // Chain law delays
  const activeChainLaws = chainLaws.filter((law) => law.isActive);
  activeChainLaws.forEach((law) => {
    switch (law.status) {
      case 'r1':
        delayHours += 0.5; // R1: Chains required, 30min delay
        break;
      case 'r2':
        delayHours += 1.5; // R2: Chains or traction devices, 1.5hr delay
        break;
      case 'r3':
        delayHours += 3; // R3: Closed to traffic, 3hr delay
        break;
    }
  });

  return delayHours;
}

/**
 * Identify hazards from weather data along route
 */
export function identifyHazards(weatherPoints: WeatherPoint[]): Hazard[] {
  const hazards: Hazard[] = [];

  weatherPoints.forEach((point) => {
    // Ice hazard: Temperature < 32°F + precipitation
    if (point.temperature < 32 && point.precipitation > 0.1) {
      hazards.push({
        type: 'ice',
        severity: Math.min(10, Math.ceil((32 - point.temperature) / 3)),
        lat: point.lat,
        lon: point.lon,
        description: `Ice conditions: ${point.temperature}°F, ${point.precipitation}" precip`,
      });
    }

    // Wind hazard: Wind speed > 35mph
    if (point.windSpeed > 35) {
      hazards.push({
        type: 'wind',
        severity: Math.min(10, Math.ceil((point.windSpeed - 35) / 5)),
        lat: point.lat,
        lon: point.lon,
        description: `High winds: ${point.windSpeed}mph`,
      });
    }

    // Storm hazard: Heavy precipitation + wind
    if (point.precipitation > 0.5 && point.windSpeed > 25) {
      hazards.push({
        type: 'storm',
        severity: Math.min(10, Math.ceil(point.precipitation * 5)),
        lat: point.lat,
        lon: point.lon,
        description: `Severe weather: ${point.description}`,
      });
    }
  });

  return hazards;
}

/**
 * Calculate risk score (1-10 scale)
 * 
 * Scoring:
 * - Ice: 3 points per incident
 * - Wind: 2 points per incident
 * - Storm: 4 points per incident
 * - Chain Laws: R1=2pts, R2=4pts, R3=6pts
 */
export function calculateRiskScore(
  hazards: Hazard[],
  chainLaws: ChainLaw[]
): number {
  let score = 0;

  // Weather hazards
  hazards.forEach((hazard) => {
    switch (hazard.type) {
      case 'ice':
        score += 3;
        break;
      case 'wind':
        score += 2;
        break;
      case 'storm':
        score += 4;
        break;
    }
  });

  // Chain laws
  const activeChainLaws = chainLaws.filter((law) => law.isActive);
  activeChainLaws.forEach((law) => {
    switch (law.status) {
      case 'r1':
        score += 2;
        break;
      case 'r2':
        score += 4;
        break;
      case 'r3':
        score += 6;
        break;
    }
  });

  // Normalize to 1-10 scale
  return Math.min(10, Math.max(1, Math.ceil(score / 3)));
}

/**
 * Main calculation function
 */
export function calculateRouteMetrics(
  routeData: RouteData,
  loadDetails: LoadDetails
): CalculationResult {
  // 1. Identify hazards from weather data
  const hazards = identifyHazards(routeData.weatherPoints);

  // 2. Estimate delay hours
  const delayHours = estimateDelayHours(hazards, routeData.chainLaws);

  // 3. Calculate risk score
  const riskScore = calculateRiskScore(hazards, routeData.chainLaws);

  // 4. Get base rate
  const baseRate =
    loadDetails.rate || loadDetails.trip_rate || 0;

  // 5. Calculate projected net
  const projectedNet = calculateProjectedNet(baseRate, delayHours);

  // 6. Calculate profit per mile
  const distance =
    loadDetails.distance || loadDetails.trip_distance_mi || 1;
  const profitPerMile = projectedNet / distance;

  return {
    projectedNet,
    riskScore,
    hazards,
    delayHours,
    profitPerMile,
  };
}

// Web Worker message handler (if running in worker context)
if (typeof self !== 'undefined' && 'onmessage' in self) {
  self.onmessage = (e: MessageEvent) => {
    const { routeData, loadDetails } = e.data;
    const result = calculateRouteMetrics(routeData, loadDetails);
    self.postMessage(result);
  };
}
