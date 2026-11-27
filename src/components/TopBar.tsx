import { RefreshCw } from 'lucide-react';

export type ActiveNavTab = 'arrivals' | 'favorites' | 'directory' | 'api';

interface TopBarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const NAV_ITEMS: { id: ActiveNavTab; label: string }[] = [
  { id: 'arrivals', label: 'Live Arrivals' },
  { id: 'favorites', label: 'Saved Stops' },
  { id: 'directory', label: 'Stop Directory' },
  { id: 'api', label: 'API Schema' },
];

export function TopBar({ activeTab, onSelectTab, onRefresh, isRefreshing }: TopBarProps) {
  return (
    <header className="md:sticky md:top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('arrivals')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] rounded px-1 -ml-1 cursor-pointer"
        >
          SG BusTime
        </button>

        <nav className="hidden md:flex items-center gap-6" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] rounded ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[17px] h-0.5 bg-[#008751]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#008751] hover:bg-[#006F42] active:bg-[#005B36] disabled:opacity-70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#008751]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh ETAs</span>
          </button>
        </div>
      </div>
    </header>
  );
}
