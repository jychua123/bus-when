import { ArrowUpRight, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SINGAPORE_BUS_STOPS } from '../data/singaporeBusStops';
import { FavoriteStop, SingaporeRegion } from '../types/bus';

interface StopDirectoryViewProps {
  favorites: FavoriteStop[];
  onSelectStop: (code: string) => void;
  onToggleFavorite: (code: string) => void;
}

const REGIONS: ('All' | SingaporeRegion)[] = ['All', 'Central', 'East', 'West', 'North', 'North-East'];

export function StopDirectoryView({
  favorites,
  onSelectStop,
  onToggleFavorite,
}: StopDirectoryViewProps) {
  const [region, setRegion] = useState<'All' | SingaporeRegion>('All');
  const [filterText, setFilterText] = useState('');

  const favCodes = useMemo(() => new Set(favorites.map((f) => f.code)), [favorites]);

  const filteredStops = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return SINGAPORE_BUS_STOPS.filter((stop) => {
      if (region !== 'All' && stop.region !== region) return false;
      if (!q) return true;
      return (
        stop.code.toLowerCase().includes(q) ||
        stop.description.toLowerCase().includes(q) ||
        stop.roadName.toLowerCase().includes(q) ||
        stop.district.toLowerCase().includes(q) ||
        stop.services.some((s) => s.toLowerCase() === q)
      );
    });
  }, [region, filterText]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Singapore Bus Stop Directory</h2>
          <p className="mt-1 text-sm text-slate-500">
            {SINGAPORE_BUS_STOPS.length} major interchanges and transit corridors available in offline sample mode.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  region === r
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter code, road, or bus..."
              aria-label="Filter bus stop directory"
              className="w-full h-10 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008751]"
            />
          </div>
        </div>
      </div>

      {filteredStops.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">No stops match "{filterText}"</p>
          <p className="mt-1 text-xs text-slate-500">
            Try clearing your region filter or searching another Singapore road or 5-digit code.
          </p>
          <button
            type="button"
            onClick={() => {
              setRegion('All');
              setFilterText('');
            }}
            className="mt-4 min-h-[40px] px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-5 sm:pl-6 pr-3">Stop Code</th>
                <th className="py-3 px-3">Stop Name &amp; Road</th>
                <th className="py-3 px-3 hidden md:table-cell">Region</th>
                <th className="py-3 px-3 hidden lg:table-cell">Services</th>
                <th className="py-3 pl-3 pr-5 sm:pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredStops.map((stop) => {
                const isFav = favCodes.has(stop.code);
                return (
                  <tr key={stop.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 pl-5 sm:pl-6 pr-3 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {stop.code}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900">{stop.description}</div>
                      <div className="text-xs text-slate-500">
                        {stop.roadName} · {stop.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 hidden md:table-cell whitespace-nowrap">
                      {stop.region}
                    </td>
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <div className="font-mono text-xs text-slate-600 tabular-nums max-w-md truncate">
                        {stop.services.join(', ')}
                      </div>
                    </td>
                    <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(stop.code)}
                          aria-label={isFav ? `Remove ${stop.description} from favorites` : `Add ${stop.description} to favorites`}
                          className={`min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                            isFav
                              ? 'bg-amber-50 border-amber-200 text-amber-500'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectStop(stop.code)}
                          className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>View ETAs</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
