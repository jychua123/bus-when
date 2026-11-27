import { Check, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

interface ApiConnectionViewProps {
  customApiUrl: string;
  onSaveApiUrl: (url: string) => void;
}

export function ApiConnectionView({ customApiUrl, onSaveApiUrl }: ApiConnectionViewProps) {
  const [urlDraft, setUrlDraft] = useState(customApiUrl);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiUrl(urlDraft.trim());
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    setUrlDraft('');
    onSaveApiUrl('');
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-900">API Connection &amp; LTA DataMall Adapter</h2>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          This front-end is decoupled from its data source through <span className="font-mono text-slate-900">busApi.fetchArrivals()</span>. By default, it runs on a ticking Singapore sample dataset. When your backend proxy for LTA DataMall (<span className="font-mono text-slate-900">BusArrivalv2</span> / <span className="font-mono text-slate-900">v3/BusArrival</span>) is ready, enter its endpoint URL below.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-3">
          <label htmlFor="api-endpoint-input" className="block text-xs font-semibold text-slate-700">
            Arrival Proxy Endpoint URL (optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="api-endpoint-input"
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://your-proxy.example.com/api/bus-arrival?BusStopCode={code}"
              className="flex-1 h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008751] focus:bg-white"
            />
            <button
              type="submit"
              className="h-11 px-5 inline-flex items-center justify-center gap-1.5 bg-[#008751] hover:bg-[#006F42] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Saved Endpoint</span>
                </>
              ) : (
                <span>Apply Endpoint</span>
              )}
            </button>
            {customApiUrl && (
              <button
                type="button"
                onClick={handleReset}
                className="h-11 px-4 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Use Sample Data</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Active mode:{' '}
            <span className="font-medium text-slate-800">
              {customApiUrl ? `Live Proxy (${customApiUrl})` : 'Built-in Singapore Sample Dataset'}
            </span>
          </p>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-slate-900">Expected LTA DataMall Response Contract</h3>
        <p className="mt-1 text-xs text-slate-500">
          Keep your LTA AccountKey in a server-side proxy route and return the standard JSON structure below:
        </p>

        <pre className="mt-4 p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`{
  "BusStopCode": "01012",
  "Services": [
    {
      "ServiceNo": "7",
      "Operator": "SBST",
      "NextBus": {
        "OriginCode": "77009",
        "DestinationCode": "11009",
        "EstimatedArrival": "2026-11-26T17:45:00+08:00",
        "Latitude": "1.2981",
        "Longitude": "103.8542",
        "VisitNumber": "1",
        "Load": "SEA",
        "Feature": "WAB",
        "Type": "DD"
      },
      "NextBus2": { "...": "..." },
      "NextBus3": { "...": "..." }
    }
  ]
}`}
        </pre>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-4 border-t border-slate-200">
          <div>
            <div className="font-semibold text-slate-900">Load Codes</div>
            <div className="mt-1 font-mono">SEA · Seats Available</div>
            <div className="font-mono">SDA · Standing Available</div>
            <div className="font-mono">LSD · Limited Standing</div>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Vehicle Type</div>
            <div className="mt-1 font-mono">SD · Single Deck</div>
            <div className="font-mono">DD · Double Deck</div>
            <div className="font-mono">BD · Bendy Bus</div>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Accessibility</div>
            <div className="mt-1 font-mono">WAB · Wheelchair Accessible</div>
            <div className="font-mono">"" · Standard Floor</div>
          </div>
        </div>
      </div>
    </section>
  );
}
