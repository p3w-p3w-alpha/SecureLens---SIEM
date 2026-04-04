import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { Activity, Shield, AlertTriangle, FileWarning, Clock, ArrowUpRight } from 'lucide-react';
import ThreatGlobeGL from '../components/ThreatGlobeGL';
import TiltCard from '../components/TiltCard';
import HudFrame from '../components/HudFrame';
import { Badge } from '../components/ui/badge';
import { getIpCoordinates, HOME_BASE } from '../utils/geoData';
import api from '../services/api';

/* ── Constants ── */
const SEV_COLOR = { CRITICAL: '#e11d48', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#3b82f6', INFO: '#94a3b8' };
const RULE_COLORS = ['#7dd3fc', '#8b5cf6', '#f43f5e', '#f59e0b', '#14b8a6', '#3b82f6', '#ec4899', '#10b981'];
const SEV_BADGE = {
  CRITICAL: 'bg-sev-critical/20 text-sev-critical', HIGH: 'bg-sev-high/20 text-sev-high',
  MEDIUM: 'bg-sev-medium/20 text-sev-medium', LOW: 'bg-sev-low/20 text-sev-low',
  INFO: 'bg-gray-500/20 text-gray-400',
};
const MITRE = [
  { id: 'TA0001', name: 'Initial Access', rules: ['R-002', 'R-008'] },
  { id: 'TA0004', name: 'Priv Escalation', rules: ['R-003'] },
  { id: 'TA0006', name: 'Credential Access', rules: ['R-001'] },
  { id: 'TA0007', name: 'Discovery', rules: ['R-005'] },
  { id: 'TA0008', name: 'Lateral Movement', rules: ['R-006'] },
  { id: 'TA0010', name: 'Exfiltration', rules: ['R-004'] },
  { id: 'TA0011', name: 'Command & Control', rules: ['R-007'] },
];
const GLASS = 'void-card border border-ghost rounded-2xl';

/* ── Helpers ── */
function AnimNum({ value, className }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, v => Math.round(v));
  const [t, setT] = useState(0);
  useEffect(() => { mv.set(value); }, [value, mv]);
  useEffect(() => display.on('change', v => setT(v)), [display]);
  return <span className={className}>{t}</span>;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return s + 's'; if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd';
}

const GlassTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-void/90 border border-ghost px-3 py-2 text-xs rounded-lg shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      {payload.map((p, i) => <p key={i} className="text-white font-semibold">{p.name || ''}: {p.value}</p>)}
    </div>
  );
};

/* ── Heatmap Cell ── */
function heatColor(val, max) {
  if (max === 0) return 'rgba(125,211,252,0.03)';
  const t = val / max;
  if (t < 0.25) return 'rgba(125,211,252,0.08)';
  if (t < 0.5) return 'rgba(125,211,252,0.2)';
  if (t < 0.75) return 'rgba(234,179,8,0.35)';
  return 'rgba(225,29,72,0.45)';
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [audit, setAudit] = useState([]);
  const [eventTypes, setEventTypes] = useState({});
  const [hourly, setHourly] = useState([]);
  const navigate = useNavigate();

  const fetchAll = useCallback(() => {
    api.get('/api/v1/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/api/v1/dashboard/trends').then(r => setTrends(r.data)).catch(() => {});
    api.get('/api/v1/audit').then(r => setAudit(r.data)).catch(() => {});
    api.get('/api/v1/dashboard/event-types').then(r => setEventTypes(r.data)).catch(() => {});
    api.get('/api/v1/dashboard/hourly-activity').then(r => setHourly(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 30000); return () => clearInterval(i); }, [fetchAll]);

  /* ── Globe data from real alerts — severity-colored ── */
  const globeData = useMemo(() => {
    if (!stats?.topSourceIps?.length) return { arcs: [], points: [{ lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#00e68a', size: 0.5 }], labels: [] };

    // Severity color from alert count (proxy when severity not in stats)
    const sevColorByCount = (count) => {
      if (count > 5) return '#ef4444'; // CRITICAL red
      if (count > 3) return '#f97316'; // HIGH orange
      if (count > 1) return '#eab308'; // MEDIUM yellow
      return '#3b82f6';                // LOW blue
    };

    const points = stats.topSourceIps.map(ip => {
      const geo = getIpCoordinates(ip.ip);
      const color = sevColorByCount(ip.count);
      return {
        lat: geo.lat, lng: geo.lng, ip: ip.ip, count: ip.count,
        color,
        alertCount: ip.count,
        size: Math.min(0.3 + ip.count * 0.08, 0.8),
        label: ip.ip,
      };
    });
    points.push({ lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#00e68a', size: 0.5, label: 'HQ', ip: null });

    const arcs = stats.topSourceIps.map(ip => {
      const geo = getIpCoordinates(ip.ip);
      const color = sevColorByCount(ip.count);
      return {
        startLat: geo.lat, startLng: geo.lng,
        endLat: HOME_BASE.lat, endLng: HOME_BASE.lng,
        color: [`${color}90`, 'rgba(0,212,255,0.4)'],
      };
    });

    const labels = stats.topSourceIps.slice(0, 5).map(ip => {
      const geo = getIpCoordinates(ip.ip);
      return { lat: geo.lat, lng: geo.lng, text: ip.ip, color: '#7dd3fc' };
    });

    return { arcs, points, labels };
  }, [stats?.topSourceIps]);

  /* ── Chart data ── */
  const sevData = useMemo(() =>
    Object.entries(stats?.alertsBySeverity || {}).map(([k, v]) => ({ name: k, count: v, fill: SEV_COLOR[k] || '#94a3b8' })),
    [stats?.alertsBySeverity]);

  const ruleData = useMemo(() =>
    Object.entries(stats?.alertsByRule || {}).map(([k, v]) => ({ name: k, value: v })),
    [stats?.alertsByRule]);

  const totalAlertCount = useMemo(() => ruleData.reduce((s, d) => s + d.value, 0), [ruleData]);

  const eventData = useMemo(() =>
    Object.entries(eventTypes).map(([k, v]) => ({ name: k, value: v })),
    [eventTypes]);

  const topIpData = useMemo(() =>
    (stats?.topSourceIps || []).slice(0, 7).map(ip => ({ ip: ip.ip, count: ip.count })),
    [stats?.topSourceIps]);

  const hourlyMax = useMemo(() => Math.max(...hourly.map(h => h.count), 1), [hourly]);

  if (!stats) return <div className="p-8 text-gray-500 text-sm font-mono animate-pulse">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Events', value: stats.totalLogs24h, icon: FileWarning, accent: 'text-ice' },
    { label: 'Active Alerts', value: stats.totalAlerts24h, icon: Activity, accent: 'text-purple-400' },
    { label: 'Critical Threats', value: stats.criticalAlerts, icon: AlertTriangle, accent: 'text-sev-critical', pulse: stats.criticalAlerts > 0 },
    { label: 'Open Incidents', value: stats.openIncidents, icon: Shield, accent: 'text-sev-medium' },
  ];

  return (
    <div className="p-5 min-h-screen space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white font-display tracking-wide">SOC Dashboard</h1>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
          <Clock className="w-3 h-3" /> Live <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* ── STAT CARDS — Connected Data Nodes ── */}
      <div className="relative">
        {/* Circuit connection lines between cards */}
        <svg className="absolute inset-0 pointer-events-none z-0 hidden lg:block" style={{ top: '50%', height: '2px' }}>
          <line x1="12.5%" y1="1" x2="37.5%" y2="1" stroke="#1e293b" strokeWidth="1" />
          <line x1="37.5%" y1="1" x2="62.5%" y2="1" stroke="#1e293b" strokeWidth="1" />
          <line x1="62.5%" y1="1" x2="87.5%" y2="1" stroke="#1e293b" strokeWidth="1" />
          {/* Traveling ice pulse dot */}
          <circle r="2" fill="#7dd3fc" opacity="0.5">
            <animateMotion dur="4s" repeatCount="indefinite" path="M80,1 L560,1" />
          </circle>
        </svg>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 100 }}>
                <TiltCard className="p-4 relative">
                  {/* Hex-dot status indicator */}
                  <div className={`hex-dot ${c.pulse ? 'bg-sev-critical' : 'bg-ice'} absolute top-3 right-3 animate-pulse`} />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-void-raised flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${c.accent}`} />
                    </div>
                    <div>
                      <AnimNum value={c.value} className="text-2xl font-mono font-bold text-white" />
                      <p className="text-[10px] text-gray-500 font-display mt-0.5">{c.label}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── GLOBE + SIDE CHARTS ── */}
      <div className="flex gap-5">
        {/* Globe — main hero */}
        <HudFrame scan className="flex-1">
          <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-display">Threat Origin Map</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono border-ice/20 text-ice/70 h-4 px-1.5">
                {stats.topSourceIps?.length || 0} sources
              </Badge>
              {stats.criticalAlerts > 0 && (
                <Badge variant="outline" className="text-[9px] font-mono border-red-500/30 text-red-400 bg-red-500/10 h-4 px-1.5">
                  {stats.criticalAlerts} critical
                </Badge>
              )}
            </div>
          </div>
          <ThreatGlobeGL
            height={420}
            interactive
            autoRotateSpeed={0.3}
            arcsData={globeData.arcs}
            pointsData={globeData.points}
            labelsData={globeData.labels}
            onPointClick={(pt) => pt.ip && navigate(`/intel?ip=${pt.ip}`)}
          />
          </div>
        </HudFrame>

        {/* Right column — stacked charts */}
        <div className="w-80 space-y-4 shrink-0">
          {/* Alerts by Severity */}
          <div className={`${GLASS} p-4`}>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">By Severity</span>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={sevData} layout="vertical" barGap={4}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={65} tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={12}>
                  {sevData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alerts by Rule — Donut */}
          <div className={`${GLASS} p-4`}>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">By Rule</span>
            <div className="relative">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={ruleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                    {ruleData.map((_, i) => <Cell key={i} fill={RULE_COLORS[i % RULE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<GlassTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-lg font-mono font-bold text-white">{totalAlertCount}</p>
                  <p className="text-[9px] text-gray-500">total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Attacking IPs */}
          <div className={`${GLASS} p-4`}>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">Top Attackers</span>
            <div className="space-y-1.5">
              {topIpData.map((ip, i) => (
                <Link key={i} to={`/intel?ip=${ip.ip}`} className="flex items-center gap-2 group cursor-pointer">
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-ice transition-colors truncate flex-1">{ip.ip}</span>
                  <div className="w-20 h-1.5 rounded-full bg-void-surface overflow-hidden">
                    <div className="h-full rounded-full bg-sev-critical/60" style={{ width: `${Math.min((ip.count / (topIpData[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-white w-6 text-right">{ip.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: Trend + Heatmap + MITRE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 24h Alert Trend */}
        <div className={`${GLASS} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono">Alert Trend</span>
            <span className="text-[9px] text-gray-600 bg-void-surface px-2 py-0.5 rounded-full font-mono">24h</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="tF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 9 }} interval={3} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<GlassTip />} />
              <Area type="monotone" dataKey="count" stroke="#7dd3fc" strokeWidth={2} fill="url(#tF)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Activity Heatmap */}
        <div className={`${GLASS} p-4`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">Hourly Activity</span>
          <div className="flex gap-[2px] items-end h-[120px]">
            {hourly.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${h.hour}:00 — ${h.count} events`}>
                <div className="flex-1 w-full rounded-sm transition-colors" style={{ background: heatColor(h.count, hourlyMax), minHeight: 4 }} />
                {i % 4 === 0 && <span className="text-[8px] text-gray-600 font-mono">{h.hour}</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[8px] text-gray-600 font-mono">Low</span>
            <div className="flex gap-0.5">
              {['rgba(125,211,252,0.08)', 'rgba(125,211,252,0.2)', 'rgba(234,179,8,0.35)', 'rgba(225,29,72,0.45)'].map((c, i) => (
                <div key={i} className="w-3 h-2 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[8px] text-gray-600 font-mono">High</span>
          </div>
        </div>

        {/* MITRE ATT&CK Coverage */}
        <div className={`${GLASS} p-4`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">MITRE ATT&CK Coverage</span>
          <div className="grid grid-cols-4 gap-1.5">
            {MITRE.map(m => {
              const active = m.rules.some(r => stats.alertsByRule?.[r]);
              return (
                <div key={m.id} className={`p-2 rounded-lg text-center transition-all group cursor-default ${
                  active ? 'bg-ice/10 border border-ice/30' : 'bg-void-surface border border-ghost'
                }`} title={`${m.name}\nRules: ${m.rules.join(', ')}`}>
                  <p className={`text-[8px] font-mono font-bold ${active ? 'text-ice' : 'text-gray-600'}`}>{m.id}</p>
                  <p className="text-[7px] text-gray-500 mt-0.5 truncate">{m.name}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-600 font-mono mt-2 text-center">
            {MITRE.filter(m => m.rules.some(r => stats.alertsByRule?.[r])).length}/{MITRE.length} tactics active
          </p>
        </div>
      </div>

      {/* ── EVENT TYPE + BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Event Type Distribution */}
        <div className={`${GLASS} p-4`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">Event Types</span>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={eventData.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={1} strokeWidth={0}>
                {eventData.slice(0, 8).map((_, i) => <Cell key={i} fill={RULE_COLORS[i % RULE_COLORS.length]} opacity={0.7} />)}
              </Pie>
              <Tooltip content={<GlassTip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className={`${GLASS} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono">Recent Alerts</span>
            <Link to="/alerts" className="text-[10px] text-ice font-mono flex items-center gap-0.5 hover:text-white transition-colors">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {(stats.recentAlerts || []).slice(0, 8).map((a, i) => (
              <Link key={a.id} to={`/alerts/${a.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-void-surface transition-colors group">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${SEV_BADGE[a.severity] || SEV_BADGE.INFO}`}>{a.severity?.charAt(0)}</span>
                <span className="text-[11px] text-gray-300 flex-1 truncate group-hover:text-white transition-colors">{a.ruleName}</span>
                <span className="text-[9px] text-gray-600 font-mono">{timeAgo(a.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className={`${GLASS} p-4`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">Activity</span>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {audit.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-start gap-2 px-1 py-1.5 rounded-lg hover:bg-void-surface transition-colors">
                <span className="text-[8px] font-mono font-bold bg-void-surface text-ice px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5">{a.action}</span>
                <span className="text-[10px] text-gray-400 flex-1 leading-relaxed truncate">{a.details}</span>
                <span className="text-[9px] text-gray-600 font-mono whitespace-nowrap">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No activity</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
