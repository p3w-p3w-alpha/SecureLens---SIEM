import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const SEVERITY_COLORS = {
  INFO: 'bg-gray-200 text-gray-700',
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  NEW: 'bg-red-100 text-red-700',
  INVESTIGATING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-700',
  FALSE_POSITIVE: 'bg-gray-200 text-gray-600',
};

const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];
const SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({ severity: '', status: '', ruleId: '', sourceIp: '' });
  const [activeFilters, setActiveFilters] = useState({});

  const fetchAlerts = (pageNum, applied) => {
    const params = { page: pageNum, size: 20 };
    if (applied.severity) params.severity = applied.severity;
    if (applied.status) params.status = applied.status;
    if (applied.ruleId) params.ruleId = applied.ruleId;
    if (applied.sourceIp) params.sourceIp = applied.sourceIp;

    api.get('/api/v1/alerts', { params })
      .then((res) => {
        setAlerts(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      })
      .catch(() => setAlerts([]));
  };

  const fetchStats = () => {
    api.get('/api/v1/alerts/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlerts(page, activeFilters);
    fetchStats();
  }, [page, activeFilters]);

  const applyFilters = () => { setPage(0); setActiveFilters({ ...filters }); };
  const clearFilters = () => {
    setFilters({ severity: '', status: '', ruleId: '', sourceIp: '' });
    setPage(0);
    setActiveFilters({});
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded p-3">
            <p className="text-xs text-gray-500">Total (24h)</p>
            <p className="text-2xl font-bold">{stats.total24h}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-xs text-red-600">Critical</p>
            <p className="text-2xl font-bold text-red-700">{stats.bySeverity?.CRITICAL || 0}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <p className="text-xs text-orange-600">High</p>
            <p className="text-2xl font-bold text-orange-700">{stats.bySeverity?.HIGH || 0}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <p className="text-xs text-gray-500">New (unresolved)</p>
            <p className="text-2xl font-bold">{stats.byStatus?.NEW || 0}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
          <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">All</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rule ID</label>
          <input type="text" value={filters.ruleId} onChange={(e) => setFilters({ ...filters, ruleId: e.target.value })}
            placeholder="e.g. R-001" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Source IP</label>
          <input type="text" value={filters.sourceIp} onChange={(e) => setFilters({ ...filters, sourceIp: e.target.value })}
            placeholder="e.g. 10.0.0.1" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32" />
        </div>
        <button onClick={applyFilters} className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700">Apply Filters</button>
        <button onClick={clearFilters} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50">Clear Filters</button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Rule</th>
              <th className="px-3 py-2 font-medium">MITRE</th>
              <th className="px-3 py-2 font-medium">Source / User</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No alerts found</td></tr>
            )}
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEVERITY_COLORS[a.severity] || ''}`}>{a.severity}</span>
                </td>
                <td className="px-3 py-2">{a.ruleName}</td>
                <td className="px-3 py-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">{a.mitreTactic}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.mitreTechnique}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{a.sourceIp || a.userIdField || '-'}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || ''}`}>{a.status}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Link to={`/alerts/${a.id}`} className="text-xs text-gray-800 underline hover:text-gray-600">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">{totalElements} total — Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 0}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>
    </div>
  );
}
