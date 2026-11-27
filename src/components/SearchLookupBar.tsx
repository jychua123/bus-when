import { ArrowRight, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { busApi } from '../services/busApi';
import { BusStop } from '../types/bus';

interface SearchLookupBarProps {
  selectedStopCode: string;
  recentCodes: string[];
  onSelectStop: (code: string) => void;
}

export function SearchLookupBar({
  selectedStopCode,
  recentCodes,
  onSelectStop,
}: SearchLookupBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return busApi.searchBusStops('').slice(0, 8);
    }
    return busApi.searchBusStops(trimmed).slice(0, 8);
  }, [query]);

  const isExactFiveDigitCode = /^\d{5}$/.test(query.trim());
  const exactKnownStop = isExactFiveDigitCode ? busApi.getBusStop(query.trim()) : undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setValidationMsg(null);
  }, [query]);

  const commitStopSelection = (code: string) => {
    onSelectStop(code);
    setQuery('');
    setIsOpen(false);
    setValidationMsg(null);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (/^\d{5}$/.test(trimmed)) {
      commitStopSelection(trimmed);
      return;
    }

    if (matches.length > 0) {
      const target = matches[activeIndex] ?? matches[0];
      commitStopSelection(target.code);
      return;
    }

    if (/^\d+$/.test(trimmed)) {
      setValidationMsg('Singapore bus stop codes are 5 digits (e.g. 01012 or 09048).');
    } else {
      setValidationMsg('No matching stop found. Try a 5-digit code like 01012, 09048, or 75009.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalOptions =
      matches.length + (isExactFiveDigitCode && !exactKnownStop ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (totalOptions > 0 ? (prev + 1) % totalOptions : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) =>
        totalOptions > 0 ? (prev - 1 + totalOptions) % totalOptions : 0
      );
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const quickStops = useMemo(() => {
    return recentCodes
      .map((code) => busApi.getBusStop(code))
      .filter((s): s is BusStop => Boolean(s))
      .slice(0, 5);
  }, [recentCodes]);

  return (
    <section
      aria-label="Bus Stop Search"
      className="bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Singapore Bus Arrivals
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter any 5-digit LTA bus stop code, road name, or service number for live arrival times.
            </p>
          </div>

          <div ref={containerRef} className="relative w-full lg:max-w-xl">
            <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  value={query}
                  onFocus={() => setIsOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 5-digit stop code (e.g. 01012, 09048) or street..."
                  aria-label="Search by 5-digit bus stop code, road, or bus number"
                  aria-expanded={isOpen}
                  aria-autocomplete="list"
                  className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-300 focus:border-[#008751] focus:bg-white rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008751]/20 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search query"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="h-11 px-5 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
              >
                <span>Lookup</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            {validationMsg && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {validationMsg}
              </p>
            )}

            {isOpen && (
              <div
                role="listbox"
                aria-label="Matching bus stops"
                className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{query.trim() ? 'Matching Stops' : 'Popular Singapore Stops'}</span>
                  <span className="font-mono tabular-nums">5-Digit Code</span>
                </div>

                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {isExactFiveDigitCode && !exactKnownStop && (
                    <li>
                      <button
                        type="button"
                        onClick={() => commitStopSelection(query.trim())}
                        className={`w-full px-3.5 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          activeIndex === 0 ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Lookup Stop <span className="font-mono tabular-nums">{query.trim()}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Load arrival board preview for this 5-digit stop code
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#008751] whitespace-nowrap">
                          Load Code →
                        </span>
                      </button>
                    </li>
                  )}

                  {matches.map((stop, idx) => {
                    const optionIdx =
                      isExactFiveDigitCode && !exactKnownStop ? idx + 1 : idx;
                    const isHighlighted = optionIdx === activeIndex;
                    const isCurrent = stop.code === selectedStopCode;

                    return (
                      <li key={stop.code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => commitStopSelection(stop.code)}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                            isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0 w-12">
                              {stop.code}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {stop.description}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {stop.roadName} · {stop.district} · {stop.services.length} services
                              </div>
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="text-xs font-medium text-[#008751] whitespace-nowrap shrink-0">
                              Viewing
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}

                  {matches.length === 0 && !isExactFiveDigitCode && (
                    <li className="px-4 py-6 text-center text-sm text-slate-500">
                      No matching bus stop in sample directory. Enter any 5-digit stop code (e.g.{' '}
                      <span className="font-mono text-slate-800">09048</span>) to inspect.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Quick-jump recent stops */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0 mr-1">
            Quick Stops:
          </span>
          {quickStops.map((stop) => {
            const active = stop.code === selectedStopCode;
            return (
              <button
                key={stop.code}
                type="button"
                onClick={() => commitStopSelection(stop.code)}
                className={`inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008751] ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono tabular-nums font-semibold">{stop.code}</span>
                <span className="max-w-[130px] truncate">{stop.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
