import { Play, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { busApi } from '../services/busApi';
import { ServerHealthStatus } from '../types/bus';

export function ApiConnectionView() {
  const [health, setHealth] = useState<ServerHealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const [testStopCode, setTestStopCode] = useState('04121');
  const [testServiceNo, setTestServiceNo] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    setHealthError(null);
    try {
      const data = await busApi.checkHealth();
      setHealth(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unable to reach /api/health');
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  const handleTestEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingEndpoint(true);
    setTestResult(null);
    try {
      const params = new URLSearchParams({ BusStopCode: testStopCode.trim() });
      if (testServiceNo.trim()) {
        params.set('ServiceNo', testServiceNo.trim());
      }
      const res = await fetch(`/api/busarrival?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setTestResult(`HTTP ${res.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setTestingEndpoint(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      {/* Serverless Health Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Serverless LTA DataMall v3 Connection</h2>
            <p className="mt-1 text-sm text-slate-600">
              Requests are proxied server-side via <span className="font-mono text-slate-900">/api/busarrival</span> so your <span className="font-mono text-slate-900">LTA_ACCOUNT_KEY</span> never reaches the browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runHealthCheck()}
            disabled={checkingHealth}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Check /api/health</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-200 text-sm">
          <div>
            <div className="text-xs text-slate-500">Health Endpoint</div>
            <div className="mt-1 font-mono font-semibold text-slate-900">
              {healthError ? 'Unavailable' : health ? `OK (${health.status})` : 'Checking...'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">LTA_ACCOUNT_KEY Status</div>
            <div
              className={`mt-1 font-semibold ${
                health?.ltaAccountKeyConfigured ? 'text-[#008751]' : 'text-amber-700'
              }`}
            >
              {health
                ? health.ltaAccountKeyConfigured
                  ? 'Configured on Server'
                  : 'Not Set (Using Sample Fallback)'
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Refresh Cadence</div>
            <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
              {health ? `${health.refreshIntervalSeconds}s (LTA ${health.ltaApiVersion})` : '20s (LTA v3)'}
            </div>
          </div>
        </div>

        {healthError && (
          <p className="mt-3 text-xs text-red-600">{healthError}</p>
        )}

        <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <div className="font-semibold text-slate-900">How to enable live LTA DataMall data</div>
          <p className="mt-1">
            Add <span className="font-mono font-semibold text-slate-900">LTA_ACCOUNT_KEY</span> to your server environment variables (e.g., AI Studio Settings → Secrets, local <span className="font-mono text-slate-900">.env</span>, or your serverless host environment). Once set, <span className="font-mono text-slate-900">/api/busarrival</span> automatically forwards requests to <span className="font-mono text-slate-900">https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival</span> with the <span className="font-mono text-slate-900">AccountKey</span> header.
          </p>
        </div>
      </div>

      {/* Live Endpoint Tester */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-slate-900">Test /api/busarrival Endpoint</h3>
        <p className="mt-1 text-xs text-slate-500">
          Query a 5-digit bus stop code and optional service number directly against the serverless route.
        </p>

        <form onSubmit={handleTestEndpoint} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={testStopCode}
            onChange={(e) => setTestStopCode(e.target.value)}
            placeholder="BusStopCode (e.g. 04121)"
            aria-label="BusStopCode"
            className="sm:w-44 h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-[#008751]"
          />
          <input
            type="text"
            value={testServiceNo}
            onChange={(e) => setTestServiceNo(e.target.value)}
            placeholder="Optional ServiceNo (e.g. 7)"
            aria-label="ServiceNo"
            className="sm:w-48 h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-[#008751]"
          />
          <button
            type="submit"
            disabled={testingEndpoint}
            className="h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{testingEndpoint ? 'Querying...' : 'Send Request'}</span>
          </button>
        </form>

        {testResult && (
          <pre className="mt-4 p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
            {testResult}
          </pre>
        )}
      </div>

      {/* Endpoints Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-slate-900">Serverless Routes Reference</h3>
        <div className="mt-3 space-y-2.5 text-xs text-slate-600">
          <div>
            <span className="font-mono font-semibold text-slate-900">GET /api/health</span> — Returns service readiness and whether <span className="font-mono text-slate-900">LTA_ACCOUNT_KEY</span> is configured.
          </div>
          <div>
            <span className="font-mono font-semibold text-slate-900">GET /api/busarrival?BusStopCode=04121</span> — Proxies all arriving services at stop <span className="font-mono text-slate-900">04121</span> from LTA DataMall v3.
          </div>
          <div>
            <span className="font-mono font-semibold text-slate-900">GET /api/busarrival?BusStopCode=04121&amp;ServiceNo=7</span> — Filters upstream response to a single bus service.
          </div>
        </div>
      </div>
    </section>
  );
}
