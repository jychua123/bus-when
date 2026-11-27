import { SERVICE_DIRECTORY, SINGAPORE_BUS_STOPS } from '../data/singaporeBusStops';
import {
  BusFeature,
  BusLoad,
  BusOperator,
  BusServiceArrival,
  BusStop,
  BusStopArrivalsResponse,
  BusType,
  IncomingBus,
  ServerHealthStatus,
} from '../types/bus';

export interface BusArrivalProvider {
  getBusStop(code: string): BusStop | undefined;
  searchBusStops(query: string): BusStop[];
  checkHealth(): Promise<ServerHealthStatus>;
  fetchArrivals(
    busStopCode: string,
    options?: { serviceNo?: string; forceSample?: boolean }
  ): Promise<BusStopArrivalsResponse>;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function pickBusType(seed: number, busIndex: number): BusType {
  const val = (seed + busIndex * 17) % 10;
  if (val < 5) return 'DD';
  if (val < 9) return 'SD';
  return 'BD';
}

function pickBusLoad(minutesAway: number, seed: number, busIndex: number): BusLoad {
  const val = (seed + busIndex * 13) % 10;
  if (minutesAway <= 2) {
    return val < 3 ? 'LSD' : val < 7 ? 'SDA' : 'SEA';
  }
  if (val < 6) return 'SEA';
  if (val < 9) return 'SDA';
  return 'LSD';
}

function pickFeature(seed: number, busIndex: number): BusFeature {
  return (seed + busIndex) % 11 === 0 ? '' : 'WAB';
}

function buildSimulatedBus(
  stop: BusStop,
  serviceNo: string,
  headwayMins: number,
  nowMs: number,
  busIndex: number
): IncomingBus {
  const seed = hashSeed(`${stop.code}-${serviceNo}`);
  const cycleSeconds = headwayMins * 60;
  const phaseOffsetSeconds = seed % cycleSeconds;
  const epochSeconds = Math.floor(nowMs / 1000);

  const elapsedInCycle = (epochSeconds + phaseOffsetSeconds) % cycleSeconds;
  const secondsToFirst = cycleSeconds - elapsedInCycle;
  const jitter = ((seed >> (busIndex + 1)) % 3) * 35;
  const totalSeconds = secondsToFirst + busIndex * cycleSeconds + (busIndex > 0 ? jitter : 0);
  const etaMs = nowMs + totalSeconds * 1000;
  const minutesAway = Math.max(0, Math.floor(totalSeconds / 60));

  return {
    estimatedArrivalIso: new Date(etaMs).toISOString(),
    latitude: stop.latitude + (busIndex + 1) * 0.0021,
    longitude: stop.longitude - (busIndex + 1) * 0.0017,
    load: pickBusLoad(minutesAway, seed, busIndex),
    feature: pickFeature(seed, busIndex),
    type: pickBusType(seed, busIndex),
    visitNumber: 1,
  };
}

export function createPreviewStop(code: string): BusStop {
  const seed = hashSeed(code);
  const availableServices = Object.keys(SERVICE_DIRECTORY);
  const count = 4 + (seed % 4);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const svc = availableServices[(seed + i * 7) % availableServices.length];
    if (!picked.includes(svc)) picked.push(svc);
  }
  return {
    code,
    roadName: 'Singapore Corridor',
    description: `Bus Stop ${code}`,
    district: 'Preview Mode',
    region: 'Central',
    services: picked,
    latitude: 1.3521,
    longitude: 103.8198,
  };
}

function sortServicesNaturally(services: BusServiceArrival[]): BusServiceArrival[] {
  return [...services].sort((a, b) => {
    const numA = parseInt(a.serviceNo, 10);
    const numB = parseInt(b.serviceNo, 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return a.serviceNo.localeCompare(b.serviceNo);
  });
}

function normalizeLtaV3Payload(
  busStopCode: string,
  data: Record<string, unknown>
): BusStopArrivalsResponse {
  const rawServices = Array.isArray(data.Services) ? data.Services : [];

  const mapIncoming = (raw: unknown): IncomingBus | null => {
    if (!raw || typeof raw !== 'object') return null;
    const b = raw as Record<string, unknown>;
    const eta = typeof b.EstimatedArrival === 'string' ? b.EstimatedArrival.trim() : '';
    if (!eta) return null;

    const loadVal = String(b.Load || 'SEA');
    const load: BusLoad =
      loadVal === 'SDA' || loadVal === 'LSD' || loadVal === 'SEA' ? loadVal : 'SEA';

    const typeVal = String(b.Type || 'SD');
    const type: BusType =
      typeVal === 'DD' || typeVal === 'BD' || typeVal === 'SD' ? typeVal : 'SD';

    const featureVal = String(b.Feature || '');
    const feature: BusFeature = featureVal === 'WAB' ? 'WAB' : '';

    return {
      estimatedArrivalIso: eta,
      latitude: Number(b.Latitude || 0),
      longitude: Number(b.Longitude || 0),
      load,
      feature,
      type,
      visitNumber: Number(b.VisitNumber || 1),
    };
  };

  const mapped: BusServiceArrival[] = rawServices.map((item) => {
    const svc = item as Record<string, unknown>;
    const serviceNo = String(svc.ServiceNo ?? '');
    const meta = SERVICE_DIRECTORY[serviceNo];
    const nextBusObj = svc.NextBus as Record<string, unknown> | undefined;
    const destCode = String(nextBusObj?.DestinationCode ?? meta?.destinationCode ?? '');
    const knownDestStop = destCode ? SINGAPORE_BUS_STOPS.find((s) => s.code === destCode) : undefined;
    const opRaw = String(svc.Operator || meta?.operator || 'SBST');
    const operator: BusOperator =
      opRaw === 'SBST' || opRaw === 'SMRT' || opRaw === 'TTS' || opRaw === 'GAS'
        ? opRaw
        : 'SBST';

    return {
      serviceNo,
      operator,
      destinationCode: destCode,
      destinationName:
        meta?.destinationName ??
        knownDestStop?.description ??
        (destCode ? `Stop ${destCode}` : 'Terminus'),
      nextBus: mapIncoming(svc.NextBus),
      nextBus2: mapIncoming(svc.NextBus2),
      nextBus3: mapIncoming(svc.NextBus3),
    };
  });

  return {
    busStopCode,
    services: sortServicesNaturally(mapped),
    updatedAtIso: new Date().toISOString(),
    source: 'live-api',
  };
}

function buildSampleResponse(
  busStopCode: string,
  serviceNo?: string,
  fallbackReason?: 'missing-api-key'
): BusStopArrivalsResponse {
  const nowMs = Date.now();
  const stop =
    SINGAPORE_BUS_STOPS.find((s) => s.code === busStopCode) ?? createPreviewStop(busStopCode);

  const targetServices = serviceNo
    ? stop.services.filter((s) => s.toLowerCase() === serviceNo.toLowerCase())
    : stop.services;

  const services: BusServiceArrival[] = targetServices.map((svcNo) => {
    const meta = SERVICE_DIRECTORY[svcNo] ?? {
      operator: 'SBST' as const,
      destinationCode: '00000',
      destinationName: 'City Loop',
      headwayMins: 10,
    };
    const seed = hashSeed(`${stop.code}-${svcNo}`);
    const hasThirdBus = seed % 5 !== 0;

    return {
      serviceNo: svcNo,
      operator: meta.operator,
      destinationCode: meta.destinationCode,
      destinationName: meta.destinationName,
      nextBus: buildSimulatedBus(stop, svcNo, meta.headwayMins, nowMs, 0),
      nextBus2: buildSimulatedBus(stop, svcNo, meta.headwayMins, nowMs, 1),
      nextBus3: hasThirdBus ? buildSimulatedBus(stop, svcNo, meta.headwayMins, nowMs, 2) : null,
    };
  });

  return {
    busStopCode,
    services: sortServicesNaturally(services),
    updatedAtIso: new Date(nowMs).toISOString(),
    source: 'sample-dataset',
    fallbackReason,
  };
}

export const busApi: BusArrivalProvider = {
  getBusStop(code: string): BusStop | undefined {
    const normalized = code.trim();
    return SINGAPORE_BUS_STOPS.find((stop) => stop.code === normalized);
  },

  searchBusStops(query: string): BusStop[] {
    const q = query.trim().toLowerCase();
    if (!q) return SINGAPORE_BUS_STOPS;

    return SINGAPORE_BUS_STOPS.filter((stop) => {
      return (
        stop.code.toLowerCase().includes(q) ||
        stop.description.toLowerCase().includes(q) ||
        stop.roadName.toLowerCase().includes(q) ||
        stop.district.toLowerCase().includes(q) ||
        stop.services.some((svc) => svc.toLowerCase() === q)
      );
    }).sort((a, b) => {
      const aCodeMatch = a.code.startsWith(q) ? 0 : 1;
      const bCodeMatch = b.code.startsWith(q) ? 0 : 1;
      if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
      return a.code.localeCompare(b.code);
    });
  },

  async checkHealth(): Promise<ServerHealthStatus> {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Health check failed (HTTP ${res.status})`);
    }
    return (await res.json()) as ServerHealthStatus;
  },

  async fetchArrivals(
    busStopCode: string,
    options?: { serviceNo?: string; forceSample?: boolean }
  ): Promise<BusStopArrivalsResponse> {
    const normalizedCode = busStopCode.trim();
    const serviceNo = options?.serviceNo?.trim() || undefined;

    if (options?.forceSample) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return buildSampleResponse(normalizedCode, serviceNo);
    }

    const params = new URLSearchParams({ BusStopCode: normalizedCode });
    if (serviceNo) {
      params.set('ServiceNo', serviceNo);
    }

    const response = await fetch(`/api/busarrival?${params.toString()}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const payload = (await response.json()) as Record<string, unknown>;
      return normalizeLtaV3Payload(normalizedCode, payload);
    }

    let errPayload: { error?: string; code?: string } = {};
    try {
      errPayload = (await response.json()) as { error?: string; code?: string };
    } catch {
      // Ignore non-JSON error body
    }

    // If LTA_ACCOUNT_KEY hasn't been configured by the user yet, show sample arrivals with a clear notice
    if (response.status === 503 && errPayload.code === 'MISSING_API_KEY') {
      return buildSampleResponse(normalizedCode, serviceNo, 'missing-api-key');
    }

    throw new Error(
      errPayload.error || `Serverless API returned HTTP ${response.status}`
    );
  },
};

export function formatMinutesAway(iso: string, nowMs: number): { mins: number; label: string; isArriving: boolean } {
  const diffMs = new Date(iso).getTime() - nowMs;
  const mins = Math.floor(diffMs / 60000);
  if (mins <= 0) {
    return { mins: 0, label: 'Arr', isArriving: true };
  }
  return { mins, label: `${mins} min`, isArriving: false };
}

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
