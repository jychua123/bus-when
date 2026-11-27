import { ArrowDown, ArrowUp, Check, Pencil, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { SINGAPORE_BUS_STOPS } from '../data/singaporeBusStops';
import { busApi, createPreviewStop } from '../services/busApi';
import { FavoriteStop, SingaporeRegion } from '../types/bus';

interface FavoritesSidebarProps {
  favorites: FavoriteStop[];
  selectedStopCode: string;
  onSelectStop: (code: string) => void;
  onToggleFavorite: (code: string) => void;
  onUpdateNickname: (code: string, nickname: string) => void;
  onMoveFavorite: (code: string, direction: 'up' | 'down') => void;
  onRestoreDefaults: () => void;
  onBrowseDirectory: () => void;
}

const REGIONS: ('All' | SingaporeRegion)[] = ['All', 'Central', 'East', 'West', 'North', 'North-East'];

export function FavoritesSidebar({
  favorites,
  selectedStopCode,
  onSelectStop,
  onToggleFavorite,
  onUpdateNickname,
  onMoveFavorite,
  onRestoreDefaults,
  onBrowseDirectory,
}: FavoritesSidebarProps) {
  const [panelTab, setPanelTab] = useState<'favorites' | 'hubs'>('favorites');
  const [regionFilter, setRegionFilter] = useState<'All' | SingaporeRegion>('All');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState('');

  const startEditing = (fav: FavoriteStop) => {
    setEditingCode(fav.code);
    setNicknameDraft(fav.nickname ?? '');
  };

  const saveEditing = (code: string) => {
    onUpdateNickname(code, nicknameDraft);
    setEditingCode(null);
  };

  const filteredHubs = SINGAPORE_BUS_STOPS.filter((stop) =>
    regionFilter === 'All' ? true : stop.region === regionFilter
  );

  return (
    <aside
      aria-label="Saved Stops and Transit Hubs"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      <div className="p-3 border-b border-slate-200 bg-slate-50/60">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setPanelTab('favorites')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              panelTab === 'favorites'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Favorites ({favorites.length})
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('hubs')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              panelTab === 'hubs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Major Hubs
          </button>
        </div>
      </div>

      {panelTab === 'favorites' ? (
        <div className="flex-1">
          {favorites.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">No saved stops yet</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Star any bus stop on the arrival board or add a nickname for one-tap access during your commute.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onRestoreDefaults}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Load Sample Favorites
                </button>
                <button
                  type="button"
                  onClick={onBrowseDirectory}
                  className="min-h-[40px] px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Browse Stop Directory
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {favorites.map((fav, index) => {
                const stop = busApi.getBusStop(fav.code) ?? createPreviewStop(fav.code);
                const isSelected = fav.code === selectedStopCode;
                const isEditing = editingCode === fav.code;

                return (
                  <li
                    key={fav.code}
                    className={`transition-colors ${
                      isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStop(fav.code)}
                          className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {fav.code}
                            </span>
                            {isSelected && (
                              <span className="text-[11px] font-semibold text-[#008751]">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                            {fav.nickname ? fav.nickname : stop.description}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 truncate">
                            {fav.nickname ? `${stop.description} · ` : ''}
                            {stop.roadName} · {stop.services.length} services
                          </div>
                          {fav.pinnedServices.length > 0 && (
                            <div className="mt-1.5 text-xs text-slate-600 font-mono tabular-nums truncate">
                              Pinned: {fav.pinnedServices.join(', ')}
                            </div>
                          )}
                        </button>

                        <div className="flex items-center shrink-0 -mr-1">
                          <button
                            type="button"
                            onClick={() => onMoveFavorite(fav.code, 'up')}
                            disabled={index === 0}
                            aria-label={`Move ${stop.description} up`}
                            className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveFavorite(fav.code, 'down')}
                            disabled={index === favorites.length - 1}
                            aria-label={`Move ${stop.description} down`}
                            className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(fav)}
                            aria-label={`Rename ${stop.description}`}
                            className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(fav.code)}
                            aria-label={`Remove ${stop.description} from favorites`}
                            className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            saveEditing(fav.code);
                          }}
                          className="mt-2.5 flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            value={nicknameDraft}
                            onChange={(e) => setNicknameDraft(e.target.value)}
                            placeholder="Label (e.g. Home, Office)"
                            maxLength={28}
                            autoFocus
                            className="flex-1 h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#008751]"
                          />
                          <button
                            type="submit"
                            aria-label="Save nickname"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-[#008751] text-white rounded-md hover:bg-[#006F42] cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCode(null)}
                            aria-label="Cancel nickname edit"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-2.5 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setRegionFilter(region)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regionFilter === region
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          <ul className="divide-y divide-slate-200 max-h-[540px] overflow-y-auto">
            {filteredHubs.map((stop) => {
              const isSelected = stop.code === selectedStopCode;
              const isFav = favorites.some((f) => f.code === stop.code);

              return (
                <li
                  key={stop.code}
                  className={`px-4 py-3 flex items-center justify-between gap-2 transition-colors ${
                    isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectStop(stop.code)}
                    className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {stop.code}
                      </span>
                      <span className="text-xs text-slate-500">{stop.region}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {stop.description}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {stop.roadName} · {stop.services.length} services
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(stop.code)}
                    aria-label={isFav ? `Unfavorite ${stop.description}` : `Favorite ${stop.description}`}
                    className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      isFav
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
