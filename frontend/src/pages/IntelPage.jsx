import { useState } from 'react';
import api from '../services/api';

function detectQueryType(query) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(query)) return 'IP';
  if (/^CVE-\d{4}-\d+$/i.test(query)) return 'CVE';
  return 'HASH';
}

function riskColor(score) {
  if (score <= 30) return 'text-green-600';
  if (score <= 70) return 'text-yellow-600';
  return 'text-red-600';
}

function riskBg(score) {
  if (score <= 30) return 'bg-green-100';
  if (score <= 70) return 'bg-yellow-100';
  return 'bg-red-100';
}

function riskBarColor(score) {
  if (score <= 30) return 'bg-green-500';
  if (score <= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function IntelPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [queryType, setQueryType] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    const type = detectQueryType(query.trim());
    setQueryType(type);

    try {
      let res;
      if (type === 'IP') res = await api.get(`/api/v1/intel/ip/${query.trim()}`);
      else if (type === 'CVE') res = await api.get(`/api/v1/intel/cve/${query.trim()}`);
      else res = await api.get(`/api/v1/intel/hash/${query.trim()}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Threat Intelligence</h1>
      <p className="text-gray-500 text-sm mb-6">Look up IPs, file hashes, or CVE IDs across multiple threat intel providers.</p>

      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter IP address, file hash, or CVE ID (e.g., 8.8.8.8, CVE-2021-44228)"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">{error}</div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-8">Querying threat intelligence providers...</div>
      )}

      {result && (
        <div>
          {/* Overall Risk Score */}
          <div className={`rounded p-6 mb-6 text-center ${riskBg(result.overallRiskScore)}`}>
            <p className="text-sm text-gray-600 mb-1">Overall Risk Score ({queryType})</p>
            <p className={`text-5xl font-bold ${riskColor(result.overallRiskScore)}`}>
              {result.overallRiskScore}
            </p>
            <p className="text-xs text-gray-500 mt-1">/100</p>
          </div>

          {/* Provider Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.providers.map((p, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">{p.provider}</h3>
                  {!p.available && (
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">Unavailable</span>
                  )}
                </div>
                {p.available ? (
                  <>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Risk Score</span>
                        <span className={riskColor(p.riskScore)}>{p.riskScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${riskBarColor(p.riskScore)}`}
                          style={{ width: `${p.riskScore}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{p.summary}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">{p.summary}</p>
                )}
              </div>
            ))}
          </div>

          {result.providers.length === 0 && (
            <p className="text-center text-gray-400 py-4">No threat intelligence data found</p>
          )}
        </div>
      )}
    </div>
  );
}
