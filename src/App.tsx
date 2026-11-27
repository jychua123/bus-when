import { Bus, Code2, ListFilter, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiConnectionView } from './components/ApiConnectionView';
import { ArrivalBoard } from './components/ArrivalBoard';
import { FavoritesSidebar } from './components/FavoritesSidebar';
import { SearchLookupBar } from './components/SearchLookupBar';
import { StopDirectoryView } from './components/StopDirectoryView';
import { ActiveNavTab, TopBar } from './components/TopBar';
import { useFavorites } from './hooks/useFavorites';
import { busApi } from './services/busApi';
import { BusStopArrivalsResponse } from './types/bus';

const AUTO_REFRESH_SECONDS = 30;
const API_URL_STORAGE_KEY = 'sg-bustime:custom-api-url:v1';

export default function App() {
  const {
    favorites,
    recentCodes,
    getFavorite,
    toggleFavorite,
    updateNickname,
    togglePinnedService,
    moveFavorite,
    recordRecentStop,
    restoreDefaultFavorites,
  } = useFavorites();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('arrivals');
  const [selectedStopCode, setSelectedStopCode] = useState<string>(() => {
    return favorites[0]?.code ?? '01012';
  });
  const [customApiUrl, setCustomApiUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(API_URL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [arrivals, setArrivals] = useState<BusStopArrivalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(AUTO_REFRESH_SECONDS);

  const loadArrivals = useCallback(
    async (stopCode: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await busApi.fetchArrivals(stopCode, customApiUrl);
        setArrivals(res);
        setNowMs(Date.now());
        setSecondsUntilRefresh(AUTO_REFRESH_SECONDS);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to reach bus arrival service.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [customApiUrl]
  );

  // Fetch when stop or custom API endpoint changes
  useEffect(() => {
    loadArrivals(selectedStopCode);
  }, [selectedStopCode, loadArrivals]);

  // 1-second clock tick for smooth live countdowns and auto-refresh
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          loadArrivals(selectedStopCode);
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [selectedStopCode, loadArrivals]);

  const handleSelectStop = useCallback(
    (code: string) => {
      setSelectedStopCode(code);
      recordRecentStop(code);
      setActiveTab('arrivals');
    },
    [recordRecentStop]
  );

  const handleSaveApiUrl = useCallback((url: string) => {
    setCustomApiUrl(url);
    try {
      if (url) {
        localStorage.setItem(API_URL_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(API_URL_STORAGE_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadArrivals(selectedStopCode);
  }, [loadArrivals, selectedStopCode]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F9] text-slate-900 pb-16 md:pb-0">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {activeTab !== 'api' && (
        <SearchLookupBar
          selectedStopCode={selectedStopCode}
          recentCodes={recentCodes}
          onSelectStop={handleSelectStop}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(activeTab === 'arrivals' || activeTab === 'favorites') && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
            <div
              className={
                activeTab === 'favorites'
                  ? 'block'
                  : 'hidden lg:block'
              }
            >
              <FavoritesSidebar
                favorites={favorites}
                selectedStopCode={selectedStopCode}
                onSelectStop={handleSelectStop}
                onToggleFavorite={toggleFavorite}
                onUpdateNickname={updateNickname}
                onMoveFavorite={moveFavorite}
                onRestoreDefaults={restoreDefaultFavorites}
                onBrowseDirectory={() => setActiveTab('directory')}
              />
            </div>

            <div
              className={
                activeTab === 'arrivals'
                  ? 'block'
                  : 'hidden lg:block'
              }
            >
              <ArrivalBoard
                stopCode={selectedStopCode}
                arrivals={arrivals}
                isLoading={isLoading}
                error={error}
                nowMs={nowMs}
                secondsUntilRefresh={secondsUntilRefresh}
                favoriteEntry={getFavorite(selectedStopCode)}
                onToggleFavorite={toggleFavorite}
                onTogglePinnedService={togglePinnedService}
                onRetry={handleRefresh}
              />
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <StopDirectoryView
            favorites={favorites}
            onSelectStop={handleSelectStop}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {activeTab === 'api' && (
          <ApiConnectionView
            customApiUrl={customApiUrl}
            onSaveApiUrl={handleSaveApiUrl}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>SG BusTime · Singapore Bus Arrival Interface</span>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className="text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
          >
            {customApiUrl ? 'Live API Connected' : 'Sample Dataset Mode · Configure API'}
          </button>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (56px height, well under 15% sticky cap) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4"
      >
        {(
          [
            { id: 'arrivals', label: 'Arrivals', Icon: Bus },
            { id: 'favorites', label: 'Saved', Icon: Star },
            { id: 'directory', label: 'Stops', Icon: ListFilter },
            { id: 'api', label: 'API', Icon: Code2 },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                isActive ? 'text-[#008751]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
