import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FAVORITE_CODES } from '../data/singaporeBusStops';
import { FavoriteStop } from '../types/bus';

const FAVORITES_STORAGE_KEY = 'sg-bustime:favorites:v1';
const RECENT_STORAGE_KEY = 'sg-bustime:recent:v1';

const INITIAL_FAVORITES: FavoriteStop[] = DEFAULT_FAVORITE_CODES.map((code, idx) => ({
  code,
  nickname: idx === 0 ? 'Bugis / Work' : idx === 1 ? 'Orchard' : undefined,
  pinnedServices: idx === 0 ? ['7', '51', '197'] : [],
  addedAt: Date.now() - idx * 60000,
}));

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStop[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return INITIAL_FAVORITES;
  });

  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return ['01012', '09048', '14141', '28009', '75009'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage write errors
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentCodes));
    } catch {
      // Ignore storage write errors
    }
  }, [recentCodes]);

  const isFavorite = useCallback(
    (code: string) => favorites.some((f) => f.code === code),
    [favorites]
  );

  const getFavorite = useCallback(
    (code: string) => favorites.find((f) => f.code === code),
    [favorites]
  );

  const toggleFavorite = useCallback((code: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.code === code);
      if (exists) {
        return prev.filter((f) => f.code !== code);
      }
      return [{ code, pinnedServices: [], addedAt: Date.now() }, ...prev];
    });
  }, []);

  const updateNickname = useCallback((code: string, nickname: string) => {
    const trimmed = nickname.trim();
    setFavorites((prev) =>
      prev.map((f) =>
        f.code === code ? { ...f, nickname: trimmed.length > 0 ? trimmed : undefined } : f
      )
    );
  }, []);

  const togglePinnedService = useCallback((stopCode: string, serviceNo: string) => {
    setFavorites((prev) => {
      const existing = prev.find((f) => f.code === stopCode);
      if (!existing) {
        return [
          {
            code: stopCode,
            pinnedServices: [serviceNo],
            addedAt: Date.now(),
          },
          ...prev,
        ];
      }
      const isPinned = existing.pinnedServices.includes(serviceNo);
      const nextPinned = isPinned
        ? existing.pinnedServices.filter((s) => s !== serviceNo)
        : [...existing.pinnedServices, serviceNo];

      return prev.map((f) =>
        f.code === stopCode ? { ...f, pinnedServices: nextPinned } : f
      );
    });
  }, []);

  const moveFavorite = useCallback((code: string, direction: 'up' | 'down') => {
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => f.code === code);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  }, []);

  const recordRecentStop = useCallback((code: string) => {
    setRecentCodes((prev) => {
      const filtered = prev.filter((c) => c !== code);
      return [code, ...filtered].slice(0, 6);
    });
  }, []);

  const restoreDefaultFavorites = useCallback(() => {
    setFavorites(INITIAL_FAVORITES);
  }, []);

  return {
    favorites,
    recentCodes,
    isFavorite,
    getFavorite,
    toggleFavorite,
    updateNickname,
    togglePinnedService,
    moveFavorite,
    recordRecentStop,
    restoreDefaultFavorites,
  };
}
