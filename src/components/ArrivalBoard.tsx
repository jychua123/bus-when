import { Accessibility, Bookmark, Check, Copy, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OPERATOR_LABELS } from '../data/singaporeBusStops';
import { busApi, createPreviewStop, formatClockTime, formatMinutesAway } from '../services/busApi';
import {
  BusLoad,
  BusServiceArrival,
  BusStopArrivalsResponse,
  BusType,
  FavoriteStop,
  IncomingBus,
} from '../types/bus';

interface ArrivalBoardProps {
  stopCode: string;
  arrivals: BusStopArrivalsResponse | null;
  isLoading: boolean;
  error: string | null;
  nowMs: number;
  secondsUntilRefresh: number;
  favoriteEntry: FavoriteStop | undefined;
  onToggleFavorite: (code: string) => void;
  onTogglePinnedService: (stopCode: string, serviceNo: string) => void;
  onRetry: () => void;
}

type ServiceFilterMode = 'all' | 'pinned' | 'dd' | 'wab';

const LOAD_META: Record<BusLoad, { label: string; barClass: string; textClass: string }> = {
  SEA: {
    label: 'Seats',
    barClass: 'bg-[#008751]',
    textClass: 'text-[#00693E]',
  },
  SDA: {
    label: 'Standing',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-700',
  },
  LSD: {
    label: 'Limited',
    barClass: 'bg-red-600',
    textClass: 'text-red-700',
  },
};

const BUS_TYPE_META: Record<BusType, string> = {
  DD: 'Double',
  SD: 'Single',
  BD: 'Bendy',
};

function BusSlotCell({ bus, nowMs, slotLabel }: { bus: IncomingBus | null; nowMs: number; slotLabel: string }) {
  if (!bus) {
    return (
      <div className="flex flex-col justify-center py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100 min-w-[92px]">
        <span className="text-[11px] text-slate-400">{slotLabel}</span>
        <span className="font-mono text-sm font-medium text-slate-400 tabular-nums mt-0.5">
          No est.
        </span>
      </div>
    );
  }

  const eta = formatMinutesAway(bus.estimatedArrivalIso, nowMs);
  const clockTime = formatClockTime(bus.estimatedArrivalIso);
  const load = LOAD_META[bus.load];
  const deckLabel = BUS_TYPE_META[bus.type];

  return (
    <div className="flex flex-col justify-between py-2 px-3 rounded-lg bg-slate-50/80 border border-slate-200/80 min-w-[100px] sm:min-w-[114px]">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-mono text-base sm:text-lg font-bold tabular-nums tracking-tight ${
            eta.isArriving ? 'text-[#008751]' : 'text-slate-900'
          }`}
        >
          {eta.label}
        </span>
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
          {clockTime}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium ${load.textClass}`}>
          <span className={`w-1.5 h-3 rounded-xs ${load.barClass}`} aria-hidden="true" />
          {load.label}
        </span>
        <span className="text-slate-500 inline-flex items-center gap-1 whitespace-nowrap">
          {deckLabel}
          {bus.feature === 'WAB' && (
            <Accessibility
              className="w-3 h-3 text-slate-600"
              aria-label="Wheelchair accessible"
            />
          )}
        </span>
      </div>
    </div>
  );
}

export function ArrivalBoard({
  stopCode,
  arrivals,
  isLoading,
  error,
  nowMs,
  secondsUntilRefresh,
  favoriteEntry,
  onToggleFavorite,
  onTogglePinnedService,
  onRetry,
}: ArrivalBoardProps) {
  const [filterMode, setFilterMode] = useState<ServiceFilterMode>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const knownStop = busApi.getBusStop(stopCode);
  const stop = knownStop ?? createPreviewStop(stopCode);
  const isCustomPreviewStop = !knownStop;
  const isFavorited = Boolean(favoriteEntry);
  const pinnedSet = useMemo(
    () => new Set(favoriteEntry?.pinnedServices ?? []),
    [favoriteEntry]
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(stopCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be restricted in some iframes
    }
  };

  const displayedServices = useMemo(() => {
    if (!arrivals) return [];
    const q = serviceQuery.trim().toLowerCase();

    const filtered = arrivals.services.filter((svc) => {
      if (q && !svc.serviceNo.toLowerCase().includes(q) && !svc.destinationName.toLowerCase().includes(q)) {
        return false;
      }
      if (filterMode === 'pinned') {
        return pinnedSet.has(svc.serviceNo);
      }
      if (filterMode === 'dd') {
        return svc.nextBus?.type === 'DD' || svc.nextBus2?.type === 'DD';
      }
      if (filterMode === 'wab') {
        return svc.nextBus?.feature === 'WAB' || svc.nextBus2?.feature === 'WAB';
      }
      return true;
    });

    // Sort pinned services to the top while keeping numeric order within groups
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedSet.has(a.serviceNo) ? 0 : 1;
      const bPinned = pinnedSet.has(b.serviceNo) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      const numA = parseInt(a.serviceNo, 10);
      const numB = parseInt(b.serviceNo, 10);
      if (numA !== numB) return numA - numB;
      return a.serviceNo.localeCompare(b.serviceNo);
    });
  }, [arrivals, serviceQuery, filterMode, pinnedSet]);

  const updatedTimeText = arrivals
    ? new Date(arrivals.updatedAtIso).toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '—';

  return (
    <section
      aria-label="Bus Stop Live Arrivals"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Stop Header */}
      <div className="px-5 sm:px-6 py-5 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md tabular-nums">
                {stop.code}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                {favoriteEntry?.nickname ? `${favoriteEntry.nickname} — ${stop.description}` : stop.description}
              </h2>
            </div>

            <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-500">
              <span>{stop.roadName}</span>
              <span aria-hidden="true">·</span>
              <span>{stop.district}</span>
              <span aria-hidden="true">·</span>
              <span>{arrivals ? `${arrivals.services.length} services` : `${stop.services.length} services`}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Updated {updatedTimeText} (Next refresh in {secondsUntilRefresh}s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#008751]" aria-hidden="true" />
                  <span>Copied {stop.code}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(stop.code)}
              aria-pressed={isFavorited}
              className={`min-h-[40px] px-4 py-2 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] ${
                isFavorited
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400 text-amber-500' : 'text-slate-500'}`}
                aria-hidden="true"
              />
              <span>{isFavorited ? 'Saved' : 'Save Stop'}</span>
            </button>
          </div>
        </div>

        {isCustomPreviewStop && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Stop code <span className="font-mono font-semibold text-slate-900">{stop.code}</span> is not in the built-in 25-stop sample directory, so a preview schedule is shown. Connect your LTA DataMall endpoint in <span className="font-medium text-slate-900">API Schema</span> for all 5,000+ Singapore bus stops.
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="px-5 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Services' },
              { id: 'pinned', label: `Pinned (${pinnedSet.size})` },
              { id: 'dd', label: 'Double Deck' },
              { id: 'wab', label: 'Wheelchair' },
            ] as { id: ServiceFilterMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
            placeholder="Filter bus no. or dest..."
            aria-label="Filter bus services at this stop"
            className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008751]"
          />
        </div>
      </div>

      {/* Arrival Content */}
      {error ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-red-700">Unable to load bus arrivals</p>
          <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Retry Request
          </button>
        </div>
      ) : isLoading && !arrivals ? (
        <div className="divide-y divide-slate-200" aria-busy="true" aria-label="Loading bus arrivals">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-9 bg-slate-100 rounded-md animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-32 h-3.5 bg-slate-100 rounded animate-pulse" />
                  <div className="w-20 h-3 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-14 bg-slate-100 rounded-lg animate-pulse" />
                <div className="w-24 h-14 bg-slate-100 rounded-lg animate-pulse hidden sm:block" />
                <div className="w-24 h-14 bg-slate-100 rounded-lg animate-pulse hidden md:block" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedServices.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {filterMode === 'pinned' && pinnedSet.size === 0
              ? 'No pinned services at this stop'
              : 'No bus services match your filter'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filterMode === 'pinned' && pinnedSet.size === 0
              ? 'Click the bookmark icon beside any bus service to pin it to the top of this stop.'
              : 'Clear the service filter or switch back to All Services.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setServiceQuery('');
            }}
            className="mt-4 min-h-[40px] px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Show All Services
          </button>
        </div>
      ) : (
        <>
          {/* Column Legend (Desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_auto] items-center px-6 py-2.5 bg-slate-50/40 border-b border-slate-200 text-xs font-medium text-slate-500">
            <div>Service · Operator · Destination</div>
            <div className="grid grid-cols-3 gap-2.5 w-[362px]">
              <span>Next Bus</span>
              <span>2nd Bus</span>
              <span>3rd Bus</span>
            </div>
          </div>

          <ul className="divide-y divide-slate-200">
            {displayedServices.map((svc: BusServiceArrival) => {
              const isPinned = pinnedSet.has(svc.serviceNo);
              return (
                <li
                  key={svc.serviceNo}
                  className={`px-4 sm:px-6 py-4 transition-colors ${
                    isPinned ? 'bg-emerald-50/30' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onTogglePinnedService(stop.code, svc.serviceNo)}
                        aria-label={
                          isPinned
                            ? `Unpin service ${svc.serviceNo}`
                            : `Pin service ${svc.serviceNo}`
                        }
                        aria-pressed={isPinned}
                        className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors shrink-0 cursor-pointer ${
                          isPinned
                            ? 'bg-[#008751]/10 border-[#008751]/30 text-[#008751]'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isPinned ? 'fill-[#008751]' : ''}`} />
                      </button>

                      <div className="w-[72px] shrink-0">
                        <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                          {svc.serviceNo}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          To {svc.destinationName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {OPERATOR_LABELS[svc.operator]}
                          {isPinned ? ' · Pinned' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:w-[362px] shrink-0">
                      <BusSlotCell bus={svc.nextBus} nowMs={nowMs} slotLabel="Next" />
                      <BusSlotCell bus={svc.nextBus2} nowMs={nowMs} slotLabel="2nd" />
                      <BusSlotCell bus={svc.nextBus3} nowMs={nowMs} slotLabel="3rd" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Load Legend Footer */}
      <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-3 rounded-xs bg-[#008751]" aria-hidden="true" />
            <span>Seats Available</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-3 rounded-xs bg-amber-500" aria-hidden="true" />
            <span>Standing Available</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-3 rounded-xs bg-red-600" aria-hidden="true" />
            <span>Limited Standing</span>
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-slate-600">
          <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Wheelchair Accessible Bus</span>
        </div>
      </div>
    </section>
  );
}
