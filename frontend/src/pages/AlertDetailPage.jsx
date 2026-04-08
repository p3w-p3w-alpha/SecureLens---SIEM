import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Brain, ChevronDown, ChevronRight, Shield, Copy, ExternalLink, Globe2, WifiOff, Check, Crosshair, Terminal, Clock, User, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ThreatGlobeGL from '../components/ThreatGlobeGL';
import { getIpCoordinates, HOME_BASE } from '../utils/geoData';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const SEV = {
  CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', color: '#f87171', border: 'border-red-500/30' },
  HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', color: '#fb923c', border: 'border-orange-500/30' },
  MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', color: '#fbbf24', border: 'border-yellow-500/30' },
  LOW: { bg: 'bg-blue-500/15', text: 'text-blue-400', color: '#60a5fa', border: 'border-blue-500/30' },
  INFO: { bg: 'bg-gray-500/15', text: 'text-gray-400', color: '#9ca3af', border: 'border-gray-500/30' },
};
const STATUS = {
  NEW: { color: '#f87171', label: 'NEW' }, INVESTIGATING: { color: '#fbbf24', label: 'INVESTIGATING' },
  RESOLVED: { color: '#34d399', label: 'RESOLVED' }, FALSE_POSITIVE: { color: '#9ca3af', label: 'FALSE POSITIVE' },
};
const PROVIDER_ACCENT = { VirusTotal: '#60a5fa', AbuseIPDB: '#f87171', Shodan: '#fbbf24', 'AlienVault OTX': '#2dd4bf', NVD: '#a78bfa' };
const CLASSIFICATION = { CRITICAL: 'CLASSIFIED', HIGH: 'RESTRICTED', MEDIUM: 'CONFIDENTIAL', LOW: null, INFO: null };

function riskColor(s) { return s > 70 ? '#f87171' : s > 30 ? '#fbbf24' : '#34d399'; }

/* ═══ ANIMATED RISK ARC ═══ */
function RiskArc({ score, size = 100 }) {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r, color = riskColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-ghost/30" strokeWidth={4} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * Math.min(score, 100)) / 100 }}
          transition={{ type: 'spring', stiffness: 30, damping: 14 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold" style={{ color, fontSize: size * 0.24 }}>{score}</span>
        <span className="text-[8px] font-mono text-mist">/100</span>
      </div>
    </div>
  );
}

/* ═══ TARGET LOCK SEVERITY RING ═══ */
function TargetLock({ severity, alertId, size = 64 }) {
  const sev = SEV[severity] || SEV.INFO;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 8;
  const crossLen = 6;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Outer dashed ring — rotates */}
        <g className="target-lock-outer" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={sev.color} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.5} />
        </g>
        {/* Inner solid ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={sev.color} strokeWidth={1} strokeOpacity={0.7} />
        {/* Crosshair lines */}
        {[
          [cx, cy - innerR - 1, cx, cy - innerR - crossLen],
          [cx, cy + innerR + 1, cx, cy + innerR + crossLen],
          [cx - innerR - 1, cy, cx - innerR - crossLen, cy],
          [cx + innerR + 1, cy, cx + innerR + crossLen, cy],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={sev.color} strokeWidth={1} strokeOpacity={0.4} />
        ))}
        {/* CRITICAL pulse ring */}
        {severity === 'CRITICAL' && (
          <motion.circle cx={cx} cy={cy} r={outerR} fill="none" stroke={sev.color} strokeWidth={1}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ transformOrigin: `${cx}px ${cy}px` }} />
        )}
      </svg>
      {/* Alert ID in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold" style={{ color: sev.color }}>#{alertId}</span>
      </div>
    </div>
  );
}

/* ═══ TAB CONTENT WRAPPER with animation ═══ */
function AnimatedTabContent({ children, tabKey }) {
  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default function AlertDetailPage() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [intelResult, setIntelResult] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [triage, setTriage] = useState(null);
  const [triaging, setTriaging] = useState(false);
  const [detailProvider, setDetailProvider] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('evidence');

  useEffect(() => { api.get(`/api/v1/alerts/${id}`).then(r => setAlert(r.data)).catch(() => {}); }, [id]);

  const updateStatus = async (s) => {
    setUpdating(true);
    try { await api.patch(`/api/v1/alerts/${id}/status`, { status: s }); setAlert(p => ({ ...p, status: s })); }
    catch {} finally { setUpdating(false); }
  };
  const enrich = async () => { setEnriching(true); try { setIntelResult((await api.post(`/api/v1/intel/enrich-alert/${id}`)).data); } catch {} finally { setEnriching(false); } };
  const runTriage = async () => { setTriaging(true); setTriage(null); try { setTriage((await api.post(`/api/v1/alerts/${id}/triage`)).data); } catch {} finally { setTriaging(false); } };
  const copyJson = (d, i) => { navigator.clipboard.writeText(JSON.stringify(d, null, 2)); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); };
  const formatMeta = m => { if (!m) return null; try { return JSON.parse(m); } catch { return null; } };

  if (!alert) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-ice animate-pulse" />
      <span className="text-[10px] font-display text-mist tracking-[0.2em]">LOADING ALERT</span>
    </div>
  );

  const sev = SEV[alert.severity] || SEV.INFO;
  const status = STATUS[alert.status] || STATUS.NEW;
  const triageData = triage || (alert.aiTriageResult ? (() => { try { return JSON.parse(alert.aiTriageResult); } catch { return null; } })() : null);
  const fpColors = { LOW: 'text-green-400 bg-green-500/15', MEDIUM: 'text-yellow-400 bg-yellow-500/15', HIGH: 'text-red-400 bg-red-500/15' };
  const classification = CLASSIFICATION[alert.severity];

  const globeData = intelResult && alert.sourceIp ? (() => {
    const geo = getIpCoordinates(alert.sourceIp);
    if (!geo) return { points: [], arcs: [] };
    const c = riskColor(intelResult.overallRiskScore);
    return {
      points: [{ lat: geo.lat, lng: geo.lng, color: c, size: 0.5, label: geo.city }, { lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#34d399', size: 0.5, label: 'HQ' }],
      arcs: [{ startLat: geo.lat, startLng: geo.lng, endLat: HOME_BASE.lat, endLng: HOME_BASE.lng, color: [c + '90', '#7dd3fc90'] }],
    };
  })() : { points: [], arcs: [] };

  return (
    <div className="p-5 space-y-4">
      {/* ─── NAV ─── */}
      <Link to="/alerts" className="inline-flex items-center gap-1.5 text-[10px] font-display text-mist tracking-[0.15em] hover:text-ice transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> BACK TO THREAT STREAM
      </Link>
      <div className="h-px bg-gradient-to-r from-ice/20 to-transparent" />

      {/* ─── DOSSIER HEADER ─── */}
      <div className="void-card p-5 relative overflow-hidden">
        {/* Severity accent stripe with shimmer */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${sev.color}, ${sev.color}60 40%, transparent 80%)` }} />

        {/* Classification stamp */}
        {classification && (
          <div className="absolute top-3 right-4 z-10">
            <span className="stamp-mark text-[8px]" style={{ color: sev.color }}>{classification}</span>
          </div>
        )}

        {/* Watermark */}
        <div className="intercept-watermark"><span>SECURELENS</span></div>

        <div className="flex items-start gap-4 relative z-[1]">
          {/* Target Lock Ring */}
          <TargetLock severity={alert.severity} alertId={id} size={64} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-display font-bold text-frost tracking-wider">{alert.ruleName}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[9px] font-mono border ${sev.border} ${sev.bg} ${sev.text} rounded-sm`}>{alert.severity}</Badge>
              <Badge variant="outline" className="text-[9px] font-mono rounded-sm" style={{ borderColor: status.color + '40', color: status.color, background: status.color + '10' }}>{status.label}</Badge>
              <Separator orientation="vertical" className="h-3 bg-ghost/30" />
              <span className="text-[9px] font-mono border border-ice/20 text-ice/70 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"><Shield className="w-2.5 h-2.5" />{alert.mitreTactic}</span>
              <span className="text-[9px] font-mono border border-ice/20 text-ice/70 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"><Crosshair className="w-2.5 h-2.5" />{alert.mitreTechnique}</span>
              <span className="text-[9px] font-mono text-mist">{alert.ruleId}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-mist">Source IP</div>
            <div className="text-sm font-mono text-ice">{alert.sourceIp || '—'}</div>
          </div>
        </div>

        <Separator className="my-3 bg-ghost/20 relative z-[1]" />

        <div className="flex gap-6 text-[10px] font-mono text-mist relative z-[1]">
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Created: <span className="text-frost">{new Date(alert.createdAt).toLocaleString()}</span></span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Updated: <span className="text-frost">{new Date(alert.updatedAt).toLocaleString()}</span></span>
          {alert.userIdField && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> User: <span className="text-frost">{alert.userIdField}</span></span>}
        </div>
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT — Tabs with animated content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="void-card overflow-hidden">
          <div className="border-b border-ghost/30 px-4 pt-3">
            <TabsList className="bg-transparent gap-4 h-auto p-0">
              {[
                { value: 'evidence', label: `EVIDENCE (${alert.evidenceLogs?.length || 0})` },
                { value: 'intel', label: 'THREAT INTEL' },
                { value: 'triage', label: 'AI TRIAGE' },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="text-[10px] font-display tracking-[0.15em] data-[state=active]:text-ice data-[state=active]:shadow-none pb-2.5 px-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-ice bg-transparent">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Evidence Tab — Terminal Output ── */}
          <TabsContent value="evidence" className="m-0">
            <AnimatePresence mode="wait">
              {activeTab === 'evidence' && (
                <AnimatedTabContent tabKey="evidence">
                  <div className="p-4">
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{alert.description}</p>

                    {alert.evidenceLogs?.length > 0 ? (
                      /* Terminal container */
                      <div className="bg-[#0a0a0f] rounded-lg border border-ghost/30 overflow-hidden">
                        {/* Terminal chrome */}
                        <div className="bg-void-raised px-3 py-1.5 border-b border-ghost/20 flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-[6px] h-[6px] rounded-full bg-red-500/60" />
                            <div className="w-[6px] h-[6px] rounded-full bg-yellow-500/60" />
                            <div className="w-[6px] h-[6px] rounded-full bg-green-500/60" />
                          </div>
                          <Terminal className="w-2.5 h-2.5 text-mist ml-1" />
                          <span className="text-[8px] font-mono text-mist">evidence.log — {alert.evidenceLogs.length} entries</span>
                        </div>

                        <div className="p-2 max-h-[500px] overflow-y-auto">
                          {alert.evidenceLogs.map((log, i) => {
                            const ls = SEV[log.severity] || SEV.INFO;
                            return (
                              <motion.div key={log.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                              >
                                <div
                                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.02] cursor-pointer group transition-colors"
                                >
                                  <span className="text-green-400/50 font-mono text-[10px] shrink-0">{'>'}</span>
                                  {expandedLogId === log.id
                                    ? <ChevronDown className="w-2.5 h-2.5 text-mist shrink-0" />
                                    : <ChevronRight className="w-2.5 h-2.5 text-mist shrink-0" />
                                  }
                                  <span className="text-[10px] text-mist/70 font-mono tabular-nums shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  <Badge variant="outline" className="text-[7px] font-mono bg-transparent border-ghost/30 text-green-400/70 px-1 py-0 h-3.5">{log.eventType}</Badge>
                                  <span className="text-[10px] font-mono text-ice/70">{log.sourceIp}</span>
                                  <Badge variant="outline" className={`text-[7px] font-mono ${ls.bg} ${ls.text} ${ls.border} px-1 py-0 h-3.5`}>{log.severity}</Badge>
                                  <span className="text-[10px] text-green-400/50 truncate flex-1 font-mono">{log.rawMessage?.substring(0, 60)}</span>
                                </div>

                                <AnimatePresence>
                                  {expandedLogId === log.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="ml-6 mb-1 overflow-hidden">
                                      <div className="rounded p-3 border-l-2 border-green-400/20 bg-green-400/[0.02] mt-1">
                                        <p className="text-[9px] font-display text-mist tracking-widest mb-1">MESSAGE</p>
                                        <p className="text-xs text-green-400/70 whitespace-pre-wrap font-mono mb-2">{log.rawMessage}</p>
                                        {formatMeta(log.metadata) && (
                                          <>
                                            <p className="text-[9px] font-display text-mist tracking-widest mb-1">METADATA</p>
                                            <pre className="text-[11px] font-mono">
                                              {Object.entries(formatMeta(log.metadata)).map(([k, v]) => (
                                                <div key={k}><span className="text-ice">{k}</span><span className="text-mist">: </span><span className="text-green-400">{JSON.stringify(v)}</span></div>
                                              ))}
                                            </pre>
                                          </>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ) : <p className="text-sm text-mist text-center py-8">No evidence logs</p>}
                  </div>
                </AnimatedTabContent>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── Intel Tab ── */}
          <TabsContent value="intel" className="m-0">
            <AnimatePresence mode="wait">
              {activeTab === 'intel' && (
                <AnimatedTabContent tabKey="intel">
                  <div className="p-4">
                    {!intelResult ? (
                      <div className="text-center py-8">
                        <button onClick={enrich} disabled={enriching || !alert.sourceIp}
                          className="reactor-btn font-display text-[10px] tracking-[0.15em] px-6 py-3 rounded-lg disabled:opacity-30 cursor-pointer inline-flex items-center gap-2">
                          <Search className="w-3.5 h-3.5" /> {enriching ? 'ENRICHING...' : !alert.sourceIp ? 'NO SOURCE IP' : 'ENRICH SOURCE IP'}
                        </button>
                        {alert.sourceIp && <p className="text-[10px] text-mist mt-2 font-mono">Query {alert.sourceIp} across all providers</p>}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          {/* Mini globe */}
                          <div className="w-48 h-48 shrink-0 rounded-lg overflow-hidden border border-ghost/30">
                            <ThreatGlobeGL height={192} interactive={false} autoRotateSpeed={0.3} arcsData={globeData.arcs} pointsData={globeData.points} />
                          </div>
                          {/* Risk + summary */}
                          <div className="flex-1 flex flex-col items-center justify-center">
                            <RiskArc score={intelResult.overallRiskScore} size={120} />
                            <Badge variant="outline" className="mt-2 text-[9px] font-mono border-0 px-2 py-0.5 rounded-full"
                              style={{ background: riskColor(intelResult.overallRiskScore) + '15', color: riskColor(intelResult.overallRiskScore) }}>
                              {intelResult.overallRiskScore <= 30 ? 'LOW RISK' : intelResult.overallRiskScore <= 70 ? 'MODERATE' : 'HIGH RISK'}
                            </Badge>
                          </div>
                        </div>
                        <Separator className="bg-ghost/20" />
                        <div className="grid grid-cols-2 gap-2">
                          {intelResult.providers.map((p, i) => {
                            const accent = PROVIDER_ACCENT[p.provider] || '#64748b';
                            if (!p.available) return (
                              <div key={i} className="void-card !border-dashed p-3 opacity-40">
                                <div className="flex items-center gap-1.5"><WifiOff className="w-3 h-3" /><span className="text-[10px] font-display">{p.provider}</span></div>
                              </div>
                            );
                            return (
                              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                className="void-card void-scan p-3 group hover:border-ghost/80 transition-all cursor-pointer">
                                <div className="h-0.5 rounded-full mb-2 opacity-50" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-display text-frost tracking-wider">{p.provider}</span>
                                  <span className="text-[9px] font-mono font-bold" style={{ color: riskColor(p.riskScore) }}>{p.riskScore}</span>
                                </div>
                                <p className="text-[10px] text-mist line-clamp-2 leading-relaxed">{p.summary}</p>
                                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setDetailProvider(p)} className="text-[9px] text-ice hover:text-frost cursor-pointer flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" /> Details</button>
                                  {p.rawData && <button onClick={() => copyJson(p.rawData, i)} className="text-[9px] text-mist hover:text-ice cursor-pointer flex items-center gap-0.5">
                                    {copiedIdx === i ? <><Check className="w-2.5 h-2.5 text-green-400" /></> : <><Copy className="w-2.5 h-2.5" /> Raw</>}
                                  </button>}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </AnimatedTabContent>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── Triage Tab ── */}
          <TabsContent value="triage" className="m-0">
            <AnimatePresence mode="wait">
              {activeTab === 'triage' && (
                <AnimatedTabContent tabKey="triage">
                  <div className="p-4">
                    {!triageData && !triaging && (
                      <div className="text-center py-8">
                        <button onClick={runTriage} className="reactor-btn font-display text-[10px] tracking-[0.15em] px-6 py-3 rounded-lg cursor-pointer inline-flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5" /> RUN AI TRIAGE
                        </button>
                        <p className="text-[10px] text-mist mt-2 font-mono">Analyze with Mistral AI</p>
                      </div>
                    )}
                    {triaging && (
                      <div className="py-8 space-y-2 max-w-xs mx-auto">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-ice/8 rounded animate-pulse" style={{ width: `${90 - i * 15}%` }} />)}
                        <p className="text-[10px] text-mist font-mono text-center mt-3">Analyzing threat context...</p>
                      </div>
                    )}
                    {triageData && !triaging && (
                      <div className="space-y-4">
                        <div className="border-l-2 border-ice/20 pl-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="hex-dot bg-ice" />
                            <p className="text-[9px] font-display text-mist tracking-[0.15em]">SEVERITY ASSESSMENT</p>
                          </div>
                          <p className="text-sm text-frost">{typeof triageData.severityAssessment === 'string' ? triageData.severityAssessment : JSON.stringify(triageData.severityAssessment)}</p>
                        </div>

                        <div className="border-l-2 border-ice/20 pl-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="hex-dot bg-ice" />
                            <p className="text-[9px] font-display text-mist tracking-[0.15em]">ATTACK CONTEXT</p>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{typeof triageData.attackContext === 'string' ? triageData.attackContext : JSON.stringify(triageData.attackContext)}</p>
                        </div>

                        <Separator className="bg-ghost/20" />

                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="hex-dot bg-ice" />
                            <p className="text-[9px] font-display text-mist tracking-[0.15em]">RECOMMENDED ACTIONS</p>
                          </div>
                          <div className="void-card bg-void p-3 space-y-1.5">
                            {(triageData.recommendedActions || []).map((a, i) => (
                              <div key={i} className="flex gap-2 text-xs text-gray-300">
                                <span className="text-ice font-mono font-bold shrink-0 w-4 text-right">{i + 1}.</span>
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="hex-dot bg-ice" />
                          <span className="text-[9px] font-display text-mist tracking-wider">FALSE POSITIVE</span>
                          <Badge variant="outline" className={`text-[9px] font-mono px-2 py-0 rounded-sm ${fpColors[triageData.falsePositiveLikelihood] || 'text-gray-400 bg-gray-500/15'}`}>
                            {triageData.falsePositiveLikelihood}
                          </Badge>
                        </div>

                        <div className="border-l-2 border-ice/30 pl-3 bg-ice/[0.02] rounded-r-lg py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="hex-dot bg-ice" />
                            <p className="text-[9px] font-display text-mist tracking-[0.15em]">REASONING</p>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed italic">{triageData.reasoning}</p>
                        </div>

                        {triageData.relatedIndicators?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="hex-dot bg-ice" />
                              <p className="text-[9px] font-display text-mist tracking-[0.15em]">INDICATORS</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {triageData.relatedIndicators.map((ind, i) => (
                                <span key={i} className="text-[10px] font-mono text-ice bg-ice/10 px-1.5 py-0.5 rounded">{ind}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <button onClick={runTriage} className="text-[10px] font-display text-mist border border-ghost hover:border-ice/30 hover:text-ice px-3 py-1.5 rounded transition-all cursor-pointer tracking-wider">RE-TRIAGE</button>
                      </div>
                    )}
                  </div>
                </AnimatedTabContent>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* RIGHT — Status sidebar */}
        <div className="space-y-4">
          {/* Status actions */}
          <div className="void-card p-4">
            <p className="text-[9px] font-display text-mist tracking-[0.2em] mb-3">ACTIONS</p>
            <div className="flex flex-col gap-2">
              {[
                { s: 'INVESTIGATING', label: 'INVESTIGATE', color: '#fbbf24' },
                { s: 'RESOLVED', label: 'RESOLVE', color: '#34d399' },
                { s: 'FALSE_POSITIVE', label: 'FALSE POSITIVE', color: '#9ca3af' },
              ].map(b => (
                <motion.button key={b.s} whileTap={{ scale: 0.97 }} layout
                  onClick={() => updateStatus(b.s)} disabled={updating || alert.status === b.s}
                  className={`w-full px-3 py-2 text-[10px] font-display tracking-[0.15em] rounded-lg border transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-2
                    ${alert.status === b.s ? 'font-bold' : 'hover:bg-white/[0.03]'}`}
                  style={{
                    borderColor: alert.status === b.s ? b.color + '60' : '#1e293b50',
                    color: alert.status === b.s ? b.color : b.color + '80',
                    background: alert.status === b.s ? b.color + '10' : 'transparent',
                  }}>
                  {/* Active status pulsing dot */}
                  {alert.status === b.s && (
                    <motion.div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: b.color }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }} />
                  )}
                  {b.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Quick info */}
          <div className="void-card p-4 space-y-3">
            <p className="text-[9px] font-display text-mist tracking-[0.2em]">DETAILS</p>
            {[
              { k: 'Rule', v: alert.ruleId, icon: FileText },
              { k: 'Tactic', v: alert.mitreTactic, icon: Shield },
              { k: 'Technique', v: alert.mitreTechnique, icon: Crosshair },
              { k: 'Source', v: alert.sourceIp || '—', icon: Globe2 },
              { k: 'Evidence', v: `${alert.evidenceLogs?.length || 0} logs`, icon: Terminal },
            ].map((d, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-mist inline-flex items-center gap-1.5">
                    <d.icon className="w-3 h-3 text-ice/30" />
                    {d.k}
                  </span>
                  <span className="text-frost">{d.v}</span>
                </div>
                {i < 4 && <Separator className="bg-ghost/15 mt-3" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sheet — Terminal styled */}
      <Sheet open={!!detailProvider} onOpenChange={o => !o && setDetailProvider(null)}>
        <SheetContent side="right" className="bg-void border-l border-ghost w-[440px] sm:w-[500px] overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-ghost">
            <SheetTitle className="flex items-center gap-2 text-frost font-display tracking-wider text-sm">
              {detailProvider && <><Shield className="w-4 h-4" style={{ color: PROVIDER_ACCENT[detailProvider.provider] }} /> {detailProvider.provider}</>}
            </SheetTitle>
          </SheetHeader>
          {detailProvider && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-center py-2"><RiskArc score={detailProvider.riskScore} size={100} /></div>
              <div className="void-card p-3"><p className="text-sm text-gray-300 leading-relaxed">{detailProvider.summary}</p></div>
              {detailProvider.rawData && (
                <div className="bg-[#0a0a0f] rounded-lg border border-ghost/30 overflow-hidden">
                  {/* Terminal chrome */}
                  <div className="bg-void-raised px-3 py-1.5 border-b border-ghost/20 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[6px] h-[6px] rounded-full bg-red-500/60" />
                      <div className="w-[6px] h-[6px] rounded-full bg-yellow-500/60" />
                      <div className="w-[6px] h-[6px] rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-[8px] font-mono text-mist ml-1">{detailProvider.provider.toLowerCase().replace(/\s/g, '-')}.json</span>
                  </div>
                  <pre className="p-3 text-[11px] overflow-auto max-h-[50vh] font-mono">
                    {(() => {
                      try {
                        const d = typeof detailProvider.rawData === 'string' ? JSON.parse(detailProvider.rawData) : detailProvider.rawData;
                        return JSON.stringify(d, null, 2).split('\n').map((l, i) => (
                          <div key={i} className="flex">
                            <span className="text-mist/30 text-[9px] w-6 shrink-0 text-right mr-3 select-none">{i + 1}</span>
                            <span>{l.replace(/"([^"]+)":/g, '<K>$1</K>:').replace(/"([^"]+)"/g, '<S>$1</S>').split(/(<K>.*?<\/K>|<S>.*?<\/S>)/).map((p, j) => {
                              if (p.startsWith('<K>')) return <span key={j} className="text-ice">&quot;{p.replace(/<\/?K>/g, '')}&quot;</span>;
                              if (p.startsWith('<S>')) return <span key={j} className="text-green-400">&quot;{p.replace(/<\/?S>/g, '')}&quot;</span>;
                              return <span key={j} className="text-mist">{p}</span>;
                            })}</span>
                          </div>));
                      } catch { return <span className="text-mist">{String(detailProvider.rawData).substring(0, 2000)}</span>; }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
