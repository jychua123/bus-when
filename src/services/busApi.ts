import { SERVICE_DIRECTORY, SINGAPORE_BUS_STOPS } from '../data/singaporeBusStops';
import {
  BusFeature,
  BusLoad,
  BusServiceArrival,
  BusStop,
  BusStopArrivalsResponse,
  BusType,
  IncomingBus,
} from '../types/bus';

/**
 * Provider interface designed so a real backend proxy for LTA DataMall
 * (/ltaodataservice/v3/BusArrival or BusArrivalv2) can be swapped in cleanly later.
 */
export interface BusArrivalProvider {
  getBusStop(code: string): BusStop | undefined;
  searchBusStops(query: string): BusStop[];
  fetchArrivals(busStopCode: string, customApiUrl?: string): Promise<BusStopArrivalsResponse>;
}

// Deterministic hash helper so each stop + service produces consistent realistic schedules
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

  // Compute remaining seconds until the next arrival, plus headway * busIndex for 2nd/3rd bus
  const elapsedInCycle = (epochSeconds + phaseOffsetSeconds) % cycleSeconds;
  const secondsToFirst = cycleSeconds - elapsedInCycle;
  const jitter = ((seed >> (busIndex + 1)) % 3) * 35;
  const totalSeconds = secondsToFirst + busIndex * cycleSeconds + (busIndex > 0 ? jitter : 0);
  const etaMs = nowMs + totalSeconds * 1000;
  const minutesAway = Math.max(0, Math.floor(totalSeconds / 60));

  return {
    estimatedArrivalIso: new Date(etaMs).toISOString(),
    latitude: stop.latitude + ((busIndex + 1) * 0.0021),
    longitude: stop.longitude - ((busIndex + 1) * 0.0017),
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
    roadName: 'Demo Corridor Rd',
    description: `Sample Stop ${code}`,
    district: 'Preview Mode',
    region: 'Central',
    services: picked,
    latitude: 1.3521,
    longitude: 103.8198,
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
      // Prioritize exact code prefix matches first
      const aCodeMatch = a.code.startsWith(q) ? 0 : 1;
      const bCodeMatch = b.code.startsWith(q) ? 0 : 1;
      if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
      return a.code.localeCompare(b.code);
    });
  },

  async fetchArrivals(busStopCode: string, customApiUrl?: string): Promise<BusStopArrivalsResponse> {
    const normalizedCode = busStopCode.trim();

    // Hook ready for future API connection
    if (customApiUrl && customApiUrl.trim().length > 0) {
      const endpoint = customApiUrl.includes('{code}')
        ? customApiUrl.replace('{code}', encodeURIComponent(normalizedCode))
        : `${customApiUrl.replace(/\/$/, '')}?BusStopCode=${encodeURIComponent(normalizedCode)}`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data.Services)) {
        // Normalize standard LTA DataMall BusArrivalv2 payload shape
        const mapped: BusServiceArrival[] = data.Services.map((item: Record<string, any>) => {
          const mapBus = (b: Record<string, any> | undefined): IncomingBus | null => {
            if (!b || !b.EstimatedArrival) return null;
            return {
              estimatedArrivalIso: b.EstimatedArrival,
              latitude: Number(b.Latitude || 0),
              longitude: Number(b.Longitude || 0),
              load: (b.Load || 'SEA') as BusLoad,
              feature: (b.Feature || '') as BusFeature,
              type: (b.Type || 'SD') as BusType,
              visitNumber: Number(b.VisitNumber || 1),
            };
          };
          const meta = SERVICE_DIRECTORY[item.ServiceNo];
          return {
            serviceNo: String(item.ServiceNo),
            operator: (item.Operator || meta?.operator || 'SBST'),
            destinationCode: String(item.NextBus?.DestinationCode || meta?.destinationCode || ''),
            destinationName: meta?.destinationName || `Ter ${item.NextBus?.DestinationCode || ''}`.trim(),
            nextBus: mapBus(item.NextBus),
            nextBus2: mapBus(item.NextBus2),
            nextBus3: mapBus(item.NextBus3),
          };
        });

        return {
          busStopCode: normalizedCode,
          services: mapped,
          updatedAtIso: new Date().toISOString(),
          source: 'live-api',
        };
      }
      throw new Error('Unexpected API payload structure. Expected LTA DataMall "Services" array.');
    }

    // Brief realistic async delay for smooth loading UI feedback
    await new Promise((resolve) => setTimeout(resolve, 180));

    const nowMs = Date.now();
    const stop =
      SINGAPORE_BUS_STOPS.find((s) => s.code === normalizedCode) ??
      createPreviewStop(normalizedCode);

    const services: BusServiceArrival[] = stop.services.map((serviceNo) => {
      const meta = SERVICE_DIRECTORY[serviceNo] ?? {
        operator: 'SBST' as const,
        destinationCode: '00000',
        destinationName: 'City Loop',
        headwayMins: 10,
      };
      const seed = hashSeed(`${stop.code}-${serviceNo}`);
      const hasThirdBus = seed % 5 !== 0;

      return {
        serviceNo,
        operator: meta.operator,
        destinationCode: meta.destinationCode,
        destinationName: meta.destinationName,
        nextBus: buildSimulatedBus(stop, serviceNo, meta.headwayMins, nowMs, 0),
        nextBus2: buildSimulatedBus(stop, serviceNo, meta.headwayMins, nowMs, 1),
        nextBus3: hasThirdBus ? buildSimulatedBus(stop, serviceNo, meta.headwayMins, nowMs, 2) : null,
      };
    });

    // Natural sort bus numbers (2, 7, 12, 851, 851e)
    services.sort((a, b) => {
      const numA = parseInt(a.serviceNo, 10);
      const numB = parseInt(b.serviceNo, 10);
      if (numA !== numB) return numA - numB;
      return a.serviceNo.localeCompare(b.serviceNo);
    });

    return {
      busStopCode: normalizedCode,
      services,
      updatedAtIso: new Date(nowMs).toISOString(),
      source: 'sample-dataset',
    };
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
