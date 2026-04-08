import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import HudFrame from '../components/HudFrame';
import api from '../services/api';

const EVENT_TYPES = [
  'login_failed', 'login_success', 'file_access', 'permission_denied',
  'permission_granted', 'port_scan', 'data_transfer', 'process_execution',
  'config_change', 'network_connection',
];
const SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const SEV_ICON = {
  INFO: { Icon: CheckCircle2, color: 'text-mist' },
  LOW: { Icon: CheckCircle2, color: 'text-sev-low' },
  MEDIUM: { Icon: AlertTriangle, color: 'text-sev-medium' },
  HIGH: { Icon: AlertCircle, color: 'text-sev-high' },
  CRITICAL: { Icon: XCircle, color: 'text-sev-critical' },
};

function formatTs(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}
function parseMetadata(metadata) {
  if (!metadata) return null;
  try { return JSON.parse(metadata); } catch { return null; }
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({ eventType: '', severity: '', sourceIp: '', startDate: '', endDate: '' });
  const [activeFilters, setActiveFilters] = useState({});
  const [loading, setLoading] = useState(false);

  const isUnfiltered = !activeFilters.eventType && !activeFilters.severity && !activeFilters.sourceIp && !activeFilters.startDate && !activeFilters.endDate;

  const fetchLogs = (pageNum, appliedFilters) => {
    setLoading(true);
    const params = { page: pageNum, size: 20 };
    if (appliedFilters.eventType) params.eventType = appliedFilters.eventType;
    if (appliedFilters.severity) params.severity = appliedFilters.severity;
    if (appliedFilters.sourceIp) params.sourceIp = appliedFilters.sourceIp;
    if (appliedFilters.startDate) params.startDate = new Date(appliedFilters.startDate).toISOString();
    if (appliedFilters.endDate) params.endDate = new Date(appliedFilters.endDate).toISOString();
    api.get('/api/v1/logs', { params })
      .then((res) => { setLogs(res.data.content); setTotalPages(res.data.totalPages); setTotalElements(res.data.totalElements); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(page, activeFilters); }, [page, activeFilters]);

  const applyFilters = () => { setPage(0); setActiveFilters({ ...filters }); };
  const clearFilters = () => {
    setFilters({ eventType: '', severity: '', sourceIp: '', startDate: '', endDate: '' });
    setPage(0);
    setActiveFilters({});
  };

  return (
    <div className="p-6 min-h-screen">
      {/* ═══ TERMINAL FRAME ═══ */}
      <HudFrame scan>
        <div className="rounded-xl overflow-hidden">
          {/* Terminal chrome header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ghost bg-void-raised/50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[10px] font-mono text-mist">securelens@soc:~/logs$</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-mist">{totalElements} entries</span>
              {isUnfiltered && page === 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-green-400/70">LIVE</span>
                </div>
              )}
            </div>
          </div>

          {/* Filter bar — inside terminal */}
          <div className="px-4 py-3 border-b border-ghost flex flex-wrap gap-3 items-end">
            {[
              { label: 'type', key: 'eventType', opts: EVENT_TYPES, type: 'select' },
              { label: 'sev', key: 'severity', opts: SEVERITIES, type: 'select' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[8px] font-mono text-mist uppercase mb-0.5">{f.label}</label>
                <select value={filters[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                  className="void-input text-xs px-2 py-1">
                  <option value="">*</option>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-[8px] font-mono text-mist uppercase mb-0.5">ip</label>
              <input type="text" value={filters.sourceIp} onChange={e => setFilters({ ...filters, sourceIp: e.target.value })}
                placeholder="*" className="void-input text-xs px-2 py-1 w-24" />
            </div>
            <div>
              <label className="block text-[8px] font-mono text-mist uppercase mb-0.5">from</label>
              <input type="datetime-local" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                className="void-input text-xs px-2 py-1 [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-[8px] font-mono text-mist uppercase mb-0.5">to</label>
              <input type="datetime-local" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                className="void-input text-xs px-2 py-1 [color-scheme:dark]" />
            </div>
            <button onClick={applyFilters} className="reactor-btn font-mono text-[9px] tracking-wider px-3 py-1 rounded">grep</button>
            <button onClick={clearFilters} className="text-[9px] font-mono text-mist hover:text-frost transition-colors cursor-pointer">reset</button>
          </div>

          {/* ═══ LOG STREAM ═══ */}
          <div className="relative min-h-[400px] max-h-[65vh] overflow-y-auto">
            {loading && logs.length === 0 && (
              <div className="flex items-center justify-center py-16">
                <div className="w-3 h-3 rounded-full bg-ice/30 animate-ping" />
              </div>
            )}

            {!loading && logs.length === 0 && (
              <div className="text-center py-16">
                <p className="font-mono text-mist text-sm">$ no matching entries<span className="animate-pulse">_</span></p>
              </div>
            )}

            <div className="divide-y divide-ghost/30">
              <AnimatePresence>
                {logs.map((log, i) => {
                  const sevInfo = SEV_ICON[log.severity] || SEV_ICON.INFO;
                  const SevIcon = sevInfo.Icon;
                  const expanded = expandedId === log.id;
                  const meta = parseMetadata(log.metadata);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.025, type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      {/* Log entry row */}
                      <div
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-void-raised/30 cursor-pointer transition-colors group"
                      >
                        <SevIcon className={`w-3.5 h-3.5 ${sevInfo.color} shrink-0`} strokeWidth={1.5} />
                        <span className="text-[10px] font-mono text-mist tabular-nums shrink-0 w-16">{formatTs(log.timestamp)}</span>
                        <span className="text-[10px] font-mono bg-void-raised px-1.5 py-0.5 rounded text-gray-300 shrink-0">{log.eventType}</span>
                        <span className="text-[10px] font-mono text-ice shrink-0">{log.sourceIp}</span>
                        <span className="text-[10px] text-gray-500 truncate flex-1 group-hover:text-gray-400 transition-colors">{truncate(log.rawMessage, 60)}</span>
                        {expanded ? <ChevronDown className="w-3 h-3 text-mist shrink-0" /> : <ChevronRight className="w-3 h-3 text-ghost shrink-0" />}
                      </div>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-1 ml-7">
                              <div className="bg-void rounded-lg p-3 border border-ghost/50 space-y-2">
                                <div>
                                  <p className="text-[8px] font-mono text-mist uppercase mb-1">message</p>
                                  <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{log.rawMessage || '—'}</p>
                                </div>
                                {meta && (
                                  <div>
                                    <p className="text-[8px] font-mono text-mist uppercase mb-1">metadata</p>
                                    <pre className="text-[11px] bg-void-surface rounded p-2 overflow-x-auto font-mono border border-ghost/30">
                                      {Object.entries(meta).map(([k, v]) => (
                                        <div key={k}>
                                          <span className="text-ice">{k}</span>
                                          <span className="text-ghost">: </span>
                                          <span className={typeof v === 'number' ? 'text-sev-medium' : 'text-green-400'}>{JSON.stringify(v)}</span>
                                        </div>
                                      ))}
                                    </pre>
                                  </div>
                                )}
                                <div className="flex gap-4 text-[9px] font-mono text-mist">
                                  <span>dst: {log.destinationIp || '—'}</span>
                                  <span>user: {log.userIdField || '—'}</span>
                                  <span>sev: <span className={sevInfo.color}>{log.severity}</span></span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Bottom fade gradient */}
            <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-void-surface to-transparent pointer-events-none" />
          </div>

          {/* Pagination — terminal style */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-ghost">
            <span className="text-[10px] font-mono text-mist">
              <span className="text-ice">{totalElements}</span> entries — page <span className="text-frost">{page + 1}</span>/{Math.max(totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 0}
                className="reactor-btn font-mono text-[9px] tracking-wider px-3 py-1 rounded disabled:opacity-20 disabled:cursor-not-allowed">prev</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
                className="reactor-btn font-mono text-[9px] tracking-wider px-3 py-1 rounded disabled:opacity-20 disabled:cursor-not-allowed">next</button>
            </div>
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
