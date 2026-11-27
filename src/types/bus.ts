export type BusOperator = 'SBST' | 'SMRT' | 'TTS' | 'GAS';

export type BusLoad = 'SEA' | 'SDA' | 'LSD';

export type BusType = 'SD' | 'DD' | 'BD';

export type BusFeature = 'WAB' | '';

export type SingaporeRegion = 'Central' | 'East' | 'West' | 'North' | 'North-East';

export interface IncomingBus {
  estimatedArrivalIso: string;
  latitude: number;
  longitude: number;
  load: BusLoad;
  feature: BusFeature;
  type: BusType;
  visitNumber: number;
}

export interface BusServiceArrival {
  serviceNo: string;
  operator: BusOperator;
  destinationCode: string;
  destinationName: string;
  nextBus: IncomingBus | null;
  nextBus2: IncomingBus | null;
  nextBus3: IncomingBus | null;
}

export interface BusStop {
  code: string;
  roadName: string;
  description: string;
  district: string;
  region: SingaporeRegion;
  services: string[];
  latitude: number;
  longitude: number;
}

export interface BusStopArrivalsResponse {
  busStopCode: string;
  services: BusServiceArrival[];
  updatedAtIso: string;
  source: 'sample-dataset' | 'live-api';
  fallbackReason?: 'missing-api-key';
}

export interface ServerHealthStatus {
  status: string;
  service: string;
  ltaApiVersion: string;
  ltaAccountKeyConfigured: boolean;
  refreshIntervalSeconds: number;
  timestamp: string;
}

export interface FavoriteStop {
  code: string;
  nickname?: string;
  pinnedServices: string[];
  addedAt: number;
}
