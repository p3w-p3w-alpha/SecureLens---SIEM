import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, AlertTriangle, Activity, CheckCircle2, Eye, ChevronLeft, ChevronRight, X, Terminal, Radio } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import api from '../services/api';

const SEV_COLOR = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6', INFO: '#64748b' };
const SEV_BADGE = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  INFO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};
const STATUS_BADGE = {
  NEW: 'border-red-500/40 text-red-400 bg-red-500/8',
  INVESTIGATING: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/8',
  RESOLVED: 'border-green-500/40 text-green-400 bg-green-500/8',
  FALSE_POSITIVE: 'border-gray-500/40 text-gray-400 bg-gray-500/8',
};
const CLASSIFICATION = { CRITICAL: 'CLASSIFIED', HIGH: 'RESTRICTED', MEDIUM: 'CONFIDENTIAL', LOW: null, INFO: null };
const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];
const SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ═══ RADAR THREAT PULSE — SVG component ═══ */
function RadarPulse({ criticalCount }) {
  const size = 180;
  const cx = size / 2, cy = size / 2;
  const rings = [30, 52, 74];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Concentric rings */}
        {rings.map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#7dd3fc"
            strokeOpacity={0.06 + i * 0.04} strokeWidth={1} strokeDasharray={i === 2 ? 'none' : '3 3'} />
        ))}
        {/* Rotating sweep */}
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - rings[2]} stroke="#7dd3fc" strokeWidth={1.5} strokeOpacity={0.5} strokeLinecap="round" />
          {/* Sweep fade trail */}
          <path d={`M ${cx} ${cy} L ${cx} ${cy - rings[2]} A ${rings[2]} ${rings[2]} 0 0 1 ${cx + rings[2] * Math.sin(0.4)} ${cy - rings[2] * Math.cos(0.4)} Z`}
            fill="url(#sweepGrad)" opacity={0.3} />
        </motion.g>
        {/* Sweep gradient */}
        <defs>
          <radialGradient id="sweepGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Cardinal dots on outer ring */}
        {[0, 90, 180, 270].map(deg => {
          const rad = (deg * Math.PI) / 180;
          return (
            <motion.circle key={deg}
              cx={cx + rings[2] * Math.sin(rad)} cy={cy - rings[2] * Math.cos(rad)}
              r={2} fill="#7dd3fc"
              animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: deg / 360 }} />
          );
        })}
      </svg>
      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-3xl font-mono font-bold text-sev-critical">{criticalCount}</span>
        <span className="text-[7px] font-display text-mist tracking-[0.3em] mt-0.5">CRITICAL</span>
      </div>
    </div>
  );
}

/* ═══ SEVERITY HEATMAP STRIP ═══ */
function SeverityHeatmap({ stats }) {
  if (!stats?.bySeverity) return null;
  const total = SEV_ORDER.reduce((sum, s) => sum + (stats.bySeverity[s] || 0), 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4">
        {SEV_ORDER.map(s => {
          const count = stats.bySeverity[s] || 0;
          if (count === 0) return null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: SEV_COLOR[s], boxShadow: s === 'CRITICAL' ? `0 0 6px ${SEV_COLOR[s]}60` : 'none' }} />
              <span className="text-[9px] font-display text-mist tracking-wider">{s}</span>
              <span className="text-[9px] font-mono text-frost">{count}</span>
            </div>
          );
        })}
      </div>
      {/* Bar */}
      <div className="h-1.5 rounded-full bg-void-raised flex overflow-hidden">
        {SEV_ORDER.map((s, i) => {
          const count = stats.bySeverity[s] || 0;
          if (count === 0) return null;
          const pct = Math.max((count / total) * 100, 3);
          return (
            <motion.div
              key={s}
              className="h-full"
              style={{
                background: SEV_COLOR[s],
                boxShadow: s === 'CRITICAL' ? `0 0 8px ${SEV_COLOR[s]}50` : 'none',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({ severity: '', status: '', ruleId: '', sourceIp: '' });
  const [activeFilters, setActiveFilters] = useState({});

  const fetchAlerts = (p, f) => {
    const params = { page: p, size: 20, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
    api.get('/api/v1/alerts', { params }).then(r => {
      setAlerts(r.data.content);
      setTotalPages(r.data.totalPages);
      setTotalElements(r.data.totalElements);
    }).catch(() => setAlerts([]));
  };

  useEffect(() => {
    fetchAlerts(page, activeFilters);
    api.get('/api/v1/alerts/stats').then(r => setStats(r.data)).catch(() => {});
  }, [page, activeFilters]);

  const appliedEntries = Object.entries(activeFilters).filter(([, v]) => v);
  const removeFilter = (key) => {
    const next = { ...activeFilters, [key]: '' };
    setFilters(f => ({ ...f, [key]: '' }));
    setActiveFilters(next);
    setPage(0);
  };

  const isCompact = (severity) => severity === 'LOW' || severity === 'INFO';

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="hex-dot bg-sev-critical" />
          <div className="absolute inset-0 hex-dot bg-sev-critical animate-ping opacity-30" />
        </div>
        <h1 className="text-2xl font-display font-bold text-frost tracking-[0.2em]">THREAT STREAM</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-ice/30 to-transparent" />
        <Radio className="w-3.5 h-3.5 text-ice/40" />
        <span className="text-[10px] font-mono text-mist tabular-nums">{totalElements} SIGNALS</span>
      </div>

      {/* ═══ SEVERITY HEATMAP ═══ */}
      <SeverityHeatmap stats={stats} />

      {/* ═══ THREAT PULSE + STAT NODES ═══ */}
      {stats && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-2">
          {/* Left stats */}
          <div className="flex flex-col gap-3 items-end">
            {[
              { label: 'TOTAL 24H', val: stats.total24h, icon: Activity, color: '#7dd3fc' },
              { label: 'HIGH SEVERITY', val: stats.bySeverity?.HIGH || 0, icon: AlertTriangle, color: SEV_COLOR.HIGH },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }}
                className="void-card p-3 pr-5 flex items-center gap-3 w-48 relative">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}60` }} />
                <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} strokeWidth={1.5} />
                <div>
                  <p className="text-lg font-mono font-bold" style={{ color: c.color }}>{c.val}</p>
                  <p className="text-[7px] font-display text-mist tracking-[0.2em]">{c.label}</p>
                </div>
                {/* Dashed connector line */}
                <svg className="absolute -right-4 top-1/2 w-4 h-px overflow-visible" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="0" y1="0" x2="16" y2="0" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.2" />
                </svg>
              </motion.div>
            ))}
          </div>

          {/* Center radar */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <RadarPulse criticalCount={stats.bySeverity?.CRITICAL || 0} />
          </motion.div>

          {/* Right stats */}
          <div className="flex flex-col gap-3 items-start">
            {[
              { label: 'INVESTIGATING', val: stats.byStatus?.INVESTIGATING || 0, icon: Eye, color: SEV_COLOR.MEDIUM },
              { label: 'RESOLVED', val: stats.byStatus?.RESOLVED || 0, icon: CheckCircle2, color: '#34d399' },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }}
                className="void-card p-3 pl-5 flex items-center gap-3 w-48 relative">
                <svg className="absolute -left-4 top-1/2 w-4 h-px overflow-visible" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="0" y1="0" x2="16" y2="0" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.2" />
                </svg>
                <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} strokeWidth={1.5} />
                <div>
                  <p className="text-lg font-mono font-bold" style={{ color: c.color }}>{c.val}</p>
                  <p className="text-[7px] font-display text-mist tracking-[0.2em]">{c.label}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}60` }} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ COMMAND PROMPT FILTER BAR ═══ */}
      <div className="void-card overflow-hidden">
        {/* Terminal chrome header */}
        <div className="bg-void-raised px-3 py-1.5 flex items-center gap-2 border-b border-ghost/30">
          <div className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full bg-red-500/70" />
            <div className="w-[7px] h-[7px] rounded-full bg-yellow-500/70" />
            <div className="w-[7px] h-[7px] rounded-full bg-green-500/70" />
          </div>
          <Terminal className="w-3 h-3 text-mist ml-2" />
          <span className="text-[9px] font-mono text-mist">securelens://threat-filter</span>
        </div>
        {/* Filter body */}
        <div className="p-3 flex flex-wrap items-center gap-2">
          <span className="text-green-400 font-mono text-sm mr-1">{'>'}</span>

          {/* Active filter chips */}
          <AnimatePresence>
            {appliedEntries.map(([key, val]) => (
              <motion.span key={key} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1 bg-ice/10 border border-ice/20 text-ice text-[10px] font-mono px-2 py-0.5 rounded-full">
                <span className="text-mist">{key}:</span>{val}
                <button onClick={() => removeFilter(key)} className="hover:text-frost transition-colors cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </motion.span>
            ))}
          </AnimatePresence>

          <Separator orientation="vertical" className="h-4 bg-ghost/30 mx-1" />

          {/* Filter inputs */}
          {[
            { label: 'severity', key: 'severity', opts: SEVERITIES },
            { label: 'status', key: 'status', opts: STATUSES },
          ].map(f => (
            <select key={f.key} value={filters[f.key]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
              className="bg-transparent border-0 border-b border-ghost/40 text-[10px] font-mono text-frost px-1.5 py-1 focus:outline-none focus:border-ice/40 transition-colors cursor-pointer">
              <option value="" className="bg-void-surface">{f.label}</option>
              {f.opts.map(o => <option key={o} value={o} className="bg-void-surface">{o}</option>)}
            </select>
          ))}
          <input type="text" value={filters.ruleId} onChange={e => setFilters({ ...filters, ruleId: e.target.value })}
            placeholder="rule" className="bg-transparent border-0 border-b border-ghost/40 text-[10px] font-mono text-frost px-1.5 py-1 w-16 focus:outline-none focus:border-ice/40 placeholder:text-ghost transition-colors" />
          <input type="text" value={filters.sourceIp} onChange={e => setFilters({ ...filters, sourceIp: e.target.value })}
            placeholder="source ip" className="bg-transparent border-0 border-b border-ghost/40 text-[10px] font-mono text-frost px-1.5 py-1 w-24 focus:outline-none focus:border-ice/40 placeholder:text-ghost transition-colors" />

          <button onClick={() => { setPage(0); setActiveFilters({ ...filters }); }}
            className="text-[10px] font-mono text-ice hover:text-frost transition-colors cursor-pointer ml-2 px-2 py-0.5 border border-ice/30 rounded hover:bg-ice/10">
            [EXECUTE]
          </button>
          <button onClick={() => { setFilters({ severity: '', status: '', ruleId: '', sourceIp: '' }); setPage(0); setActiveFilters({}); }}
            className="text-[10px] font-mono text-mist hover:text-frost transition-colors cursor-pointer px-2 py-0.5">
            [RESET]
          </button>
        </div>
      </div>

      {/* ═══ TIMELINE SPINE + SIGNAL INTERCEPT CARDS ═══ */}
      <div className="relative pl-12">
        {/* Vertical timeline spine */}
        {alerts.length > 0 && <div className="timeline-spine" />}

        {/* Empty state */}
        {alerts.length === 0 && (
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-ghost mx-auto mb-4" strokeWidth={0.8} />
            <p className="font-display text-sm text-mist tracking-[0.2em]">NO THREATS DETECTED</p>
            <p className="text-[10px] font-mono text-ghost mt-2">All systems nominal</p>
            <div className="hex-dot bg-ice/30 mx-auto mt-4 animate-pulse" />
          </div>
        )}

        {/* Alert cards */}
        <div className="space-y-2">
          <AnimatePresence>
            {alerts.map((a, i) => {
              const compact = isCompact(a.severity);
              const classification = CLASSIFICATION[a.severity];
              const sevColor = SEV_COLOR[a.severity] || '#64748b';

              return (
                <motion.div
                  key={a.id}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <motion.div
                    className="absolute left-[-36px] top-4 w-3 h-3 rounded-full border-2 z-10"
                    style={{
                      borderColor: sevColor,
                      background: a.severity === 'CRITICAL' ? sevColor : 'transparent',
                      boxShadow: a.severity === 'CRITICAL' ? `0 0 8px ${sevColor}50` : 'none',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.04 + 0.1, type: 'spring', stiffness: 300 }}
                  />
                  {/* Horizontal connector */}
                  <div className="absolute left-[-24px] top-[22px] w-6 h-px" style={{ background: `linear-gradient(90deg, ${sevColor}40, transparent)` }} />

                  {/* Card */}
                  <Link to={`/alerts/${a.id}`} className="block group">
                    <div className={`void-card void-scan relative overflow-hidden transition-all duration-200 cursor-pointer group-hover:translate-x-1 group-hover:border-ice/15 ${compact ? 'p-2.5 pl-4' : a.severity === 'CRITICAL' ? 'p-5 pl-5' : 'p-4 pl-4'}`}>
                      {/* Severity left stripe */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                        style={{
                          background: sevColor,
                          '--sev-color': sevColor,
                          animation: a.severity === 'CRITICAL' ? 'sev-pulse 2s ease-in-out infinite' : 'none',
                        }} />

                      {/* Classification stamp for high severity */}
                      {classification && (
                        <div className="absolute top-2 right-3 z-10">
                          <span className="stamp-mark" style={{ color: sevColor }}>{classification}</span>
                        </div>
                      )}

                      {/* Watermark for CRITICAL */}
                      {a.severity === 'CRITICAL' && (
                        <div className="intercept-watermark"><span>THREAT ALERT</span></div>
                      )}

                      {/* Content — compact vs full */}
                      {compact ? (
                        /* ── Compact single-line for LOW/INFO ── */
                        <div className="flex items-center gap-3 relative z-[1]">
                          <span className="font-display text-xs text-frost tracking-wide group-hover:text-ice transition-colors">{a.ruleName}</span>
                          <Badge variant="outline" className={`text-[8px] font-mono h-4 px-1.5 border ${SEV_BADGE[a.severity]}`}>{a.severity}</Badge>
                          <span className="text-[9px] font-mono text-ice/60 hidden group-hover:inline">{a.mitreTactic}</span>
                          {a.sourceIp && <span className="text-[9px] font-mono text-mist">{a.sourceIp}</span>}
                          <div className="flex-1" />
                          <Badge variant="outline" className={`text-[8px] font-mono h-4 px-1.5 border ${STATUS_BADGE[a.status]}`}>{a.status}</Badge>
                          <span className="text-[9px] font-mono text-ghost">{timeAgo(a.createdAt)}</span>
                          <ArrowRight className="w-3 h-3 text-ghost group-hover:text-ice transition-colors" />
                        </div>
                      ) : (
                        /* ── Full layout for CRITICAL/HIGH/MEDIUM ── */
                        <div className="relative z-[1] space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="hex-dot shrink-0" style={{ background: sevColor }} />
                            <span className="font-display text-sm text-frost tracking-wide group-hover:text-ice transition-colors">{a.ruleName}</span>
                            <Badge variant="outline" className={`text-[8px] font-mono h-4 px-1.5 border ${SEV_BADGE[a.severity]}`}>{a.severity}</Badge>
                            <div className="flex-1" />
                            <span className="text-[10px] font-mono text-mist">{timeAgo(a.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-5">
                            <span className="text-[9px] border border-ice/15 text-ice/60 px-1.5 py-0.5 rounded font-mono">{a.mitreTactic}</span>
                            <span className="text-[9px] border border-ice/15 text-ice/60 px-1.5 py-0.5 rounded font-mono">{a.mitreTechnique}</span>
                            {a.sourceIp && <span className="text-[10px] font-mono text-ice">{a.sourceIp}</span>}
                            <div className="flex-1" />
                            <Badge variant="outline" className={`text-[8px] font-mono h-4 px-1.5 border ${STATUS_BADGE[a.status]}`}>{a.status}</Badge>
                            <ArrowRight className="w-3.5 h-3.5 text-ghost group-hover:text-ice transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ CYBER PAGINATION ═══ */}
      {totalPages > 0 && (
        <div className="void-card p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-mist">
              <span className="text-ice">{totalElements}</span> results
            </span>
            <div className="h-px w-12 bg-gradient-to-r from-ice/20 to-transparent mt-1" />
          </div>

          {/* Page dots */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="w-6 h-6 rounded-full border border-ghost/40 flex items-center justify-center hover:border-ice/30 hover:bg-ice/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
              <ChevronLeft className="w-3 h-3 text-mist" />
            </button>

            {(() => {
              const dots = [];
              const maxDots = 7;
              let start = Math.max(0, page - Math.floor(maxDots / 2));
              const end = Math.min(totalPages, start + maxDots);
              if (end - start < maxDots) start = Math.max(0, end - maxDots);

              if (start > 0) dots.push(<span key="start-ellipsis" className="text-[8px] font-mono text-ghost px-0.5">...</span>);
              for (let i = start; i < end; i++) {
                dots.push(
                  <button key={i} onClick={() => setPage(i)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === page ? 'bg-ice shadow-[0_0_6px_rgba(125,211,252,0.4)] scale-125' : 'bg-ghost/60 hover:bg-ghost'}`} />
                );
              }
              if (end < totalPages) dots.push(<span key="end-ellipsis" className="text-[8px] font-mono text-ghost px-0.5">...</span>);
              return dots;
            })()}

            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="w-6 h-6 rounded-full border border-ghost/40 flex items-center justify-center hover:border-ice/30 hover:bg-ice/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
              <ChevronRight className="w-3 h-3 text-mist" />
            </button>
          </div>

          <span className="text-[10px] font-mono text-mist">
            Page <span className="text-frost">{page + 1}</span>/<span className="text-frost">{Math.max(totalPages, 1)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
