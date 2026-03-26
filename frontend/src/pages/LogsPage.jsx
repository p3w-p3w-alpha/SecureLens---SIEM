import { useEffect, useState } from 'react';
import api from '../services/api';

const EVENT_TYPES = [
  'login_failed', 'login_success', 'file_access', 'permission_denied',
  'permission_granted', 'port_scan', 'data_transfer', 'process_execution',
  'config_change', 'network_connection',
];

const SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const SEVERITY_COLORS = {
  INFO: 'bg-gray-200 text-gray-700',
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    sourceIp: '',
    startDate: '',
    endDate: '',
  });
  const [activeFilters, setActiveFilters] = useState({});

  const fetchLogs = (pageNum, appliedFilters) => {
    const params = { page: pageNum, size: 20 };
    if (appliedFilters.eventType) params.eventType = appliedFilters.eventType;
    if (appliedFilters.severity) params.severity = appliedFilters.severity;
    if (appliedFilters.sourceIp) params.sourceIp = appliedFilters.sourceIp;
    if (appliedFilters.startDate) params.startDate = new Date(appliedFilters.startDate).toISOString();
    if (appliedFilters.endDate) params.endDate = new Date(appliedFilters.endDate).toISOString();

    api.get('/api/v1/logs', { params })
      .then((res) => {
        setLogs(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      })
      .catch(() => setLogs([]));
  };

  useEffect(() => {
    fetchLogs(page, activeFilters);
  }, [page, activeFilters]);

  const applyFilters = () => {
    setPage(0);
    setActiveFilters({ ...filters });
  };

  const clearFilters = () => {
    const empty = { eventType: '', severity: '', sourceIp: '', startDate: '', endDate: '' };
    setFilters(empty);
    setPage(0);
    setActiveFilters({});
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return 'No metadata';
    try {
      return JSON.stringify(JSON.parse(metadata), null, 2);
    } catch {
      return metadata;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Security Logs</h1>

      {/* Filter Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Event Type</label>
          <select
            value={filters.eventType}
            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Source IP</label>
          <input
            type="text"
            value={filters.sourceIp}
            onChange={(e) => setFilters({ ...filters, sourceIp: e.target.value })}
            placeholder="e.g. 192.168.1.1"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input
            type="datetime-local"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input
            type="datetime-local"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={applyFilters}
          className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700"
        >
          Apply Filters
        </button>
        <button
          onClick={clearFilters}
          className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Timestamp</th>
              <th className="px-3 py-2 font-medium">Source IP</th>
              <th className="px-3 py-2 font-medium">Dest IP</th>
              <th className="px-3 py-2 font-medium">Event Type</th>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No logs found
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td colSpan={7} className="p-0">
                  <table className="w-full">
                    <tbody>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{log.sourceIp}</td>
                        <td className="px-3 py-2 font-mono text-xs">{log.destinationIp}</td>
                        <td className="px-3 py-2">{log.eventType}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEVERITY_COLORS[log.severity] || ''}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2">{log.userIdField}</td>
                        <td className="px-3 py-2 text-gray-600">{truncate(log.rawMessage, 80)}</td>
                      </tr>
                      {expandedId === log.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="mb-2">
                              <span className="font-medium text-xs text-gray-500 uppercase">Full Message</span>
                              <p className="mt-1 text-sm whitespace-pre-wrap">{log.rawMessage || 'No message'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-xs text-gray-500 uppercase">Metadata</span>
                              <pre className="mt-1 text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto">
                                {formatMetadata(log.metadata)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">
          {totalElements} total results — Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
