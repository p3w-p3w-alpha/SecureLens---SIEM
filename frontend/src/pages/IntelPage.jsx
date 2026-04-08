import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Copy, Check, ExternalLink, WifiOff, Globe2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ThreatGlobeGL from '../components/ThreatGlobeGL';
import { getIpCoordinates, HOME_BASE } from '../utils/geoData';
import api from '../services/api';
import '../components/intel/intel-styles.css';

/* ── constants ─────────────────────────────────────────────────── */
const PROVIDER_ACCENT = { VirusTotal: '#60a5fa', AbuseIPDB: '#f87171', Shodan: '#fbbf24', 'AlienVault OTX': '#2dd4bf', NVD: '#a78bfa' };
const PROVIDER_ICON = { VirusTotal: Shield, AbuseIPDB: Shield, Shodan: Globe2, 'AlienVault OTX': Shield, NVD: Shield };
const TYPE_COLORS = { IP: 'bg-ice/15 text-ice border-ice/25', CVE: 'bg-orange-500/15 text-orange-400 border-orange-500/25', HASH: 'bg-purple-500/15 text-purple-400 border-purple-500/25' };
const EXAMPLES = ['8.8.8.8', 'CVE-2021-44228', '185.220.101.3'];

function detectType(q) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(q)) return 'IP';
  if (/^CVE-\d{4}-\d+$/i.test(q)) return 'CVE';
  if (q.length > 10) return 'HASH';
  return '';
}
function riskColor(s) { return s > 70 ? '#f87171' : s > 30 ? '#fbbf24' : '#34d399'; }
function riskLabel(s) { return s > 70 ? 'HIGH RISK' : s > 30 ? 'MODERATE' : 'LOW RISK'; }

/* ── animated number ───────────────────────────────────────────── */
function AnimNum({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
}

/* ── risk arc (SVG) ────────────────────────────────────────────── */
function RiskArc({ score, size = 180 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const color = riskColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-ghost/30" strokeWidth={5} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * Math.min(score, 100)) / 100 }}
          transition={{ type: 'spring', stiffness: 30, damping: 14, mass: 1.2 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-mono font-black tracking-tighter" style={{ color }}><AnimNum value={score} /></span>
        <span className="text-[10px] font-mono text-mist mt-0.5">/100</span>
      </div>
    </div>
  );
}

/* ── provider mini card ────────────────────────────────────────── */
function ProviderMini({ p, idx, onDetail, onCopy, copied }) {
  const accent = PROVIDER_ACCENT[p.provider] || '#64748b';
  const Icon = PROVIDER_ICON[p.provider] || Shield;
  if (!p.available) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
        className="void-card !border-dashed p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-ice/[0.02] to-transparent" style={{ animation: 'scan-vertical 2.5s linear infinite' }} />
        </div>
        <div className="flex items-center gap-2 mb-1 opacity-40">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="text-xs font-display tracking-wider">{p.provider}</span>
        </div>
        <span className="text-[9px] font-mono text-mist uppercase tracking-widest">Signal Lost</span>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="void-card p-4 group cursor-pointer hover:border-ghost/80 transition-all duration-200">
      {/* accent line */}
      <div className="h-0.5 rounded-full mb-3 opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          <span className="text-xs font-display text-frost tracking-wider">{p.provider}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: riskColor(p.riskScore) + '40', color: riskColor(p.riskScore) }}>
            <span className="text-[9px] font-mono font-bold">{p.riskScore}</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-mist leading-relaxed mb-3 line-clamp-2">{p.summary}</p>
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onDetail?.(p); }} className="flex items-center gap-1 text-[10px] text-ice hover:text-frost transition-colors cursor-pointer">
          <ExternalLink className="w-3 h-3" /> Details
        </button>
        {p.rawData && (
          <button onClick={e => { e.stopPropagation(); onCopy?.(p.rawData, idx); }} className="flex items-center gap-1 text-[10px] text-mist hover:text-ice transition-colors cursor-pointer">
            {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Raw</>}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   INTEL PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function IntelPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [queryType, setQueryType] = useState('');
  const [history, setHistory] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [detailProvider, setDetailProvider] = useState(null);
  const [globePoints, setGlobePoints] = useState([{ lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#34d399', size: 0.5, label: 'HQ', ip: null }]);
  const [globeArcs, setGlobeArcs] = useState([]);
  const [globeRings, setGlobeRings] = useState([]);
  const location = useLocation();
  const globeRef = useRef(null);
  const currentType = detectType(query.trim());

  useEffect(() => {
    const ip = new URLSearchParams(location.search).get('ip');
    if (ip && !result && !loading) { setQuery(ip); doSearch(ip); }
  }, [location.search]); // eslint-disable-line

  const focusGlobe = useCallback((lat, lng) => {
    globeRef.current?.pointOfView({ lat, lng, altitude: 2 }, 1000);
  }, []);

  const doSearch = async (q) => {
    const sq = q || query.trim();
    if (!sq) return;
    setError(''); setLoading(true); setResult(null);
    const type = detectType(sq);
    setQueryType(type || 'HASH');

    if (type === 'IP') {
      const geo = getIpCoordinates(sq);
      if (geo) { setGlobeRings([{ lat: geo.lat, lng: geo.lng }]); focusGlobe(geo.lat, geo.lng); }
    }

    try {
      let res;
      if (type === 'IP') res = await api.get(`/api/v1/intel/ip/${sq}`);
      else if (type === 'CVE') res = await api.get(`/api/v1/intel/cve/${sq}`);
      else res = await api.get(`/api/v1/intel/hash/${sq}`);
      setResult(res.data);

      if (type === 'IP') {
        const geo = getIpCoordinates(sq);
        if (geo) {
          const c = riskColor(res.data.overallRiskScore);
          setGlobePoints(prev => [...prev.filter(p => p.ip !== sq),
            { lat: geo.lat, lng: geo.lng, color: c, size: 0.4, label: `${geo.city} (${res.data.overallRiskScore})`, ip: sq },
            { lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#34d399', size: 0.5, label: 'HQ', ip: null },
          ]);
          setGlobeArcs(prev => [...prev.filter(a => !(a.startLat === geo.lat && a.startLng === geo.lng)),
            { startLat: geo.lat, startLng: geo.lng, endLat: HOME_BASE.lat, endLng: HOME_BASE.lng, color: [c + '90', '#7dd3fc90'] },
          ]);
        }
      }
      setHistory(prev => [{ query: sq, type: type || 'HASH', score: res.data.overallRiskScore, time: new Date() }, ...prev].slice(0, 8));
    } catch (err) { setError(err.response?.data?.message || 'Lookup failed'); }
    finally { setLoading(false); setTimeout(() => setGlobeRings([]), 4000); }
  };

  const copyJson = (d, i) => { navigator.clipboard.writeText(JSON.stringify(d, null, 2)); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); };

  const available = result?.providers?.filter(p => p.available) || [];

  return (
    <div className="p-5 min-h-screen space-y-5">
      {/* ─── HEADER + SEARCH (single row) ─── */}
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <h1 className="text-lg font-display font-bold text-frost tracking-[0.2em] leading-none">THREAT INTEL</h1>
          <p className="text-[9px] font-mono text-mist mt-0.5">Multi-provider intelligence lookup</p>
        </div>
        <div className="flex-1 max-w-xl">
          <div className="flex items-center void-input !p-0 !rounded-lg overflow-hidden focus-within:border-ice/40 focus-within:shadow-ice-glow transition-all">
            <Search className="w-4 h-4 text-mist ml-3 shrink-0" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="IP, hash, or CVE..." className="flex-1 bg-transparent px-2.5 py-2.5 text-sm text-frost placeholder-gray-600 focus:outline-none font-mono" />
            <AnimatePresence>
              {currentType && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border mr-1.5 ${TYPE_COLORS[currentType] || ''}`}>{currentType}</motion.span>
              )}
            </AnimatePresence>
            <button onClick={() => doSearch()} disabled={loading}
              className="reactor-btn text-[9px] font-display tracking-[0.2em] px-4 py-2.5 disabled:opacity-30 cursor-pointer">{loading ? 'SCANNING' : 'SEARCH'}</button>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => { setQuery(ex); doSearch(ex); }}
              className="text-[9px] font-mono text-mist/50 border border-ghost/50 px-2 py-1 rounded hover:text-ice hover:border-ice/30 transition-all cursor-pointer">{ex}</button>
          ))}
        </div>
      </div>

      {/* error */}
      <AnimatePresence>{error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
        className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs font-mono">{error}</motion.div>}</AnimatePresence>

      {/* ─── MAIN CONTENT: SPLIT LAYOUT ─── */}
      <div className="flex gap-5" style={{ minHeight: 420 }}>
        {/* LEFT — Globe */}
        <div className="flex-1 void-card overflow-hidden relative">
          <ThreatGlobeGL height={420} interactive autoRotateSpeed={loading ? 2 : 0.3}
            arcsData={globeArcs} pointsData={globePoints} ringsData={globeRings}
            onPointClick={p => p.ip && (setQuery(p.ip), doSearch(p.ip))}
            onGlobeReady={inst => (globeRef.current = inst)} />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-ice animate-pulse" />
            <span className="text-[8px] font-mono text-mist/60 uppercase tracking-widest">Live Threat Map</span>
          </div>
          {globePoints.length > 1 && (
            <div className="absolute top-2 right-3 pointer-events-none">
              <span className="text-[9px] font-mono text-ice/50">{globePoints.length - 1} tracked</span>
            </div>
          )}
        </div>

        {/* RIGHT — Results Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          {/* loading */}
          {loading && (
            <div className="void-card flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative w-20 h-20">
                {[0,1,2].map(i => <div key={i} className="absolute inset-0 rounded-full border border-ice/20" style={{ animation: `sonar 2s ease-out infinite`, animationDelay: `${i*0.6}s` }} />)}
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-ice animate-pulse" /></div>
              </div>
              <p className="text-[10px] font-mono text-mist">Querying providers...</p>
            </div>
          )}

          {/* results */}
          {result && !loading && (
            <>
              {/* Risk Score */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="void-card p-5 text-center">
                <p className="text-[9px] font-display text-mist tracking-[0.2em] mb-3">RISK ASSESSMENT</p>
                <div className="flex justify-center"><RiskArc score={result.overallRiskScore} size={160} /></div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-3">
                  <Badge variant="outline" className="text-[10px] font-mono border-0 px-3 py-1 rounded-full"
                    style={{ background: riskColor(result.overallRiskScore) + '15', color: riskColor(result.overallRiskScore) }}>
                    {riskLabel(result.overallRiskScore)}
                  </Badge>
                </motion.div>
                <Separator className="my-3 bg-ghost/30" />
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-mist">Providers</span>
                  <span className="text-frost">{available.length}/{result.providers?.length || 0}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono mt-1">
                  <span className="text-mist">Query</span>
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] ${TYPE_COLORS[queryType] || ''}`}>{queryType}</span>
                </div>
              </motion.div>

              {/* History */}
              {history.length > 0 && (
                <div className="void-card p-3">
                  <p className="text-[8px] font-display text-mist tracking-[0.2em] mb-2">INVESTIGATION LOG</p>
                  <div className="space-y-0.5 max-h-36 overflow-y-auto">
                    {history.map((h, i) => (
                      <motion.div key={h.query + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => { setQuery(h.query); doSearch(h.query); }}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.02] cursor-pointer group"
                        style={{ borderLeft: `2px solid ${riskColor(h.score)}25` }}>
                        <span className="text-[9px] font-mono text-mist/50 tabular-nums">{new Date(h.time).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[10px] font-mono text-ice group-hover:text-frost transition-colors truncate flex-1">{h.query}</span>
                        <span className="text-[9px] font-mono" style={{ color: riskColor(h.score) }}>{h.score}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* empty */}
          {!result && !loading && !error && (
            <div className="void-card flex-1 flex flex-col items-center justify-center gap-3">
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                <Shield className="w-8 h-8 text-ghost" strokeWidth={1} />
              </motion.div>
              <p className="text-[10px] font-display text-mist tracking-wider text-center">Awaiting query</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── PROVIDER CARDS (below split) ─── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-display text-mist tracking-[0.2em]">PROVIDER INTELLIGENCE</span>
              <Separator className="flex-1 bg-ghost/20" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(result.providers || []).map((p, i) => (
                <ProviderMini key={i} p={p} idx={i} onDetail={setDetailProvider} onCopy={(d, idx) => copyJson(d, idx)} copied={copiedIdx === i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SHEET ─── */}
      <Sheet open={!!detailProvider} onOpenChange={o => !o && setDetailProvider(null)}>
        <SheetContent side="right" className="bg-void border-l border-ghost w-[440px] sm:w-[500px] overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-ghost">
            <SheetTitle className="flex items-center gap-2 text-frost font-display tracking-wider text-sm">
              {detailProvider && <><Shield className="w-4 h-4" style={{ color: PROVIDER_ACCENT[detailProvider.provider] }} /> {detailProvider.provider}</>}
            </SheetTitle>
          </SheetHeader>
          {detailProvider && (
            <Tabs defaultValue="summary" className="mt-4">
              <TabsList className="bg-void-surface border border-ghost w-full">
                <TabsTrigger value="summary" className="flex-1 text-[10px] font-display tracking-wider data-[state=active]:bg-ice/10 data-[state=active]:text-ice">SUMMARY</TabsTrigger>
                <TabsTrigger value="raw" className="flex-1 text-[10px] font-display tracking-wider data-[state=active]:bg-ice/10 data-[state=active]:text-ice">RAW DATA</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="space-y-4 mt-4">
                <div className="flex justify-center py-2"><RiskArc score={detailProvider.riskScore} size={120} /></div>
                <div className="void-card p-4">
                  <p className="text-[9px] font-display text-mist tracking-[0.15em] mb-2">ANALYSIS</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{detailProvider.summary}</p>
                </div>
              </TabsContent>
              <TabsContent value="raw" className="mt-4">
                {detailProvider.rawData && (
                  <>
                    <div className="flex justify-end mb-2">
                      <button onClick={() => navigator.clipboard.writeText(typeof detailProvider.rawData === 'string' ? detailProvider.rawData : JSON.stringify(detailProvider.rawData, null, 2))}
                        className="flex items-center gap-1 text-[10px] text-mist hover:text-ice transition-colors cursor-pointer"><Copy className="w-3 h-3" /> Copy</button>
                    </div>
                    <pre className="bg-void rounded-lg p-3 text-[11px] overflow-auto max-h-[60vh] border border-ghost font-mono leading-relaxed">
                      {(() => {
                        try {
                          const data = typeof detailProvider.rawData === 'string' ? JSON.parse(detailProvider.rawData) : detailProvider.rawData;
                          return JSON.stringify(data, null, 2).split('\n').map((line, i) => (
                            <div key={i}>{line.replace(/"([^"]+)":/g, '<K>$1</K>:').replace(/"([^"]+)"/g, '<S>$1</S>').split(/(<K>.*?<\/K>|<S>.*?<\/S>)/).map((p, j) => {
                              if (p.startsWith('<K>')) return <span key={j} className="text-ice">&quot;{p.replace(/<\/?K>/g, '')}&quot;</span>;
                              if (p.startsWith('<S>')) return <span key={j} className="text-green-400">&quot;{p.replace(/<\/?S>/g, '')}&quot;</span>;
                              return <span key={j} className="text-mist">{p.replace(/\b(\d+\.?\d*)\b/g, '___N___$1___N___').replace(/\b(true|false|null)\b/g, '___B___$1___B___').split(/(___N___.*?___N___|___B___.*?___B___)/).map((s, k) => {
                                if (s.startsWith('___N___')) return <span key={k} className="text-orange-400">{s.replace(/___N___/g, '')}</span>;
                                if (s.startsWith('___B___')) return <span key={k} className="text-purple-400">{s.replace(/___B___/g, '')}</span>;
                                return s;
                              })}</span>;
                            })}</div>));
                        } catch { return <span className="text-mist">{String(detailProvider.rawData).substring(0, 3000)}</span>; }
                      })()}
                    </pre>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
