import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const SCENARIOS = [
  { key: 'NORMAL', label: 'Normal Traffic', desc: 'Random mix of routine events' },
  { key: 'BRUTE_FORCE', label: 'Brute Force', desc: '7+ failed logins from same IP' },
  { key: 'IMPOSSIBLE_TRAVEL', label: 'Impossible Travel', desc: 'Same user, 2 countries in 15 min' },
  { key: 'PRIVILEGE_ESCALATION', label: 'Privilege Escalation', desc: 'Permission denied → granted' },
  { key: 'DATA_EXFILTRATION', label: 'Data Exfiltration', desc: '12+ large transfers to external IP' },
  { key: 'PORT_SCAN', label: 'Port Scan', desc: '25 port probes in under 2 min' },
  { key: 'LATERAL_MOVEMENT', label: 'Lateral Movement', desc: 'Connections to 7+ internal hosts' },
  { key: 'MALWARE_BEACON', label: 'Malware Beacon (C2)', desc: 'Regular ~60s interval callbacks' },
  { key: 'OFF_HOURS', label: 'Off-Hours Access', desc: 'Activity between 00:00-05:00 UTC' },
];

export default function SimulatorPage() {
  const [selected, setSelected] = useState([]);
  const [logCount, setLogCount] = useState(50);
  const [timeWindow, setTimeWindow] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const allSelected = selected.length === SCENARIOS.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : SCENARIOS.map((s) => s.key));
  };

  const toggleScenario = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const runSimulation = async () => {
    if (selected.length === 0) {
      setError('Select at least one scenario');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/v1/simulator/run', {
        scenarios: selected,
        logCount,
        timeWindowMinutes: timeWindow,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Log Simulator</h1>
      <p className="text-gray-600 mb-6">
        Generate realistic security logs to test the SIEM detection engine.
      </p>

      {/* Scenario Checkboxes */}
      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Attack Scenarios</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded"
            />
            Select All
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <label
              key={s.key}
              className="flex items-start gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.key)}
                onChange={() => toggleScenario(s.key)}
                className="mt-0.5 rounded"
              />
              <div>
                <span className="text-sm font-medium">{s.label}</span>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Config Inputs */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Normal Traffic Count
          </label>
          <input
            type="number"
            value={logCount}
            onChange={(e) => setLogCount(parseInt(e.target.value) || 0)}
            min={0}
            max={500}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Time Window (minutes)
          </label>
          <input
            type="number"
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value) || 0)}
            min={5}
            max={120}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28"
          />
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runSimulation}
        disabled={loading}
        className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 bg-white border border-gray-200 rounded p-4">
          <h2 className="text-lg font-semibold mb-1">Simulation Complete</h2>
          <p className="text-gray-600 text-sm mb-4">
            Generated <span className="font-bold">{result.totalGenerated}</span> total logs
          </p>

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Scenario</th>
                <th className="px-3 py-2 text-right font-medium">Logs Generated</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.breakdown).map(([scenario, count]) => (
                <tr key={scenario} className="border-t border-gray-100">
                  <td className="px-3 py-2">{scenario}</td>
                  <td className="px-3 py-2 text-right font-mono">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <Link
              to="/logs"
              className="inline-block bg-gray-100 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-200"
            >
              Go to Log Viewer →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
