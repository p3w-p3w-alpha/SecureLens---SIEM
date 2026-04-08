import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Globe, ShieldAlert, Database, Scan, Network, Radio, Clock, Activity,
  Zap, AlertTriangle, ArrowRight, CheckCircle2,
} from 'lucide-react';
import TiltCard from '../components/TiltCard';
import HudFrame from '../components/HudFrame';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const SCENARIOS = [
  { key: 'NORMAL',               label: 'Normal Traffic',        desc: 'Random mix of routine security events',           icon: Activity,    sev: 'INFO' },
  { key: 'BRUTE_FORCE',          label: 'Brute Force',           desc: '7+ failed logins from same IP within 10 min',     icon: Key,         sev: 'HIGH' },
  { key: 'IMPOSSIBLE_TRAVEL',    label: 'Impossible Travel',     desc: 'Same user, 2 countries within 15 min',            icon: Globe,       sev: 'CRITICAL' },
  { key: 'PRIVILEGE_ESCALATION', label: 'Privilege Escalation',  desc: 'Permission denied → permission granted pattern',  icon: ShieldAlert, sev: 'HIGH' },
  { key: 'DATA_EXFILTRATION',    label: 'Data Exfiltration',     desc: '12+ large transfers to external IP',              icon: Database,    sev: 'CRITICAL' },
  { key: 'PORT_SCAN',            label: 'Port Scan',             desc: '25 port probes in under 2 min',                   icon: Scan,        sev: 'MEDIUM' },
  { key: 'LATERAL_MOVEMENT',     label: 'Lateral Movement',      desc: 'Connections to 7+ distinct internal hosts',       icon: Network,     sev: 'HIGH' },
  { key: 'MALWARE_BEACON',       label: 'Malware Beacon (C2)',   desc: 'Regular ~60s interval C2 callbacks',              icon: Radio,       sev: 'CRITICAL' },
  { key: 'OFF_HOURS',            label: 'Off-Hours Access',      desc: 'Activity between 00:00–05:00 UTC',                icon: Clock,       sev: 'LOW' },
];

const SEV_DOT = {
  CRITICAL: 'bg-sev-critical',
  HIGH:     'bg-sev-high',
  MEDIUM:   'bg-sev-medium',
  LOW:      'bg-sev-low',
  INFO:     'bg-gray-500',
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' } }),
};

export default function SimulatorPage() {
  const [selected, setSelected] = useState([]);
  const [logCount, setLogCount] = useState(50);
  const [timeWindow, setTimeWindow] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const allSelected = selected.length === SCENARIOS.length;

  const toggleAll = () => setSelected(allSelected ? [] : SCENARIOS.map(s => s.key));
  const toggleScenario = (key) => setSelected(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);

  const runSimulation = async () => {
    if (selected.length === 0) { setError('Select at least one scenario'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/v1/simulator/run', { scenarios: selected, logCount, timeWindowMinutes: timeWindow });
      setResult(res.data);
    } catch (err) { setError(err.response?.data?.message || 'Simulation failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-ice/40 focus:shadow-ice-glow transition-all w-28 [color-scheme:dark]";

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Zap className="w-5 h-5 text-ice" />
            <h1 className="text-xl font-bold font-display tracking-tight" style={{ textShadow: '0 0 20px rgba(125,211,252,0.15)' }}>
              ATTACK SIMULATION CONSOLE
            </h1>
          </div>
          <p className="text-gray-500 text-xs font-mono ml-8">
            Generate realistic security logs to test SIEM detection rules
          </p>
        </div>

        {/* Scenario Selection */}
        <div className="bg-void-surface border border-ghost/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Attack Scenarios
            </span>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={toggleAll}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                allSelected
                  ? 'border-ice/50 text-ice bg-ice/10'
                  : 'border-ghost text-gray-400 hover:border-gray-500'
              }`}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCENARIOS.map((s, i) => {
              const active = selected.includes(s.key);
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.key}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleScenario(s.key)}
                  className={`relative p-3.5 void-card void-scan cursor-pointer group ${
                    active
                      ? 'border-ice/40 shadow-ice-glow'
                      : 'hover:border-ghost'
                  }`}
                >
                  {/* Severity dot */}
                  <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${SEV_DOT[s.sev]} ${active ? 'opacity-100' : 'opacity-40'} transition-opacity`} />

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-lg transition-colors ${active ? 'bg-ice/15' : 'bg-void-surface group-hover:bg-void-raised'}`}>
                      <Icon className={`w-4 h-4 transition-colors ${active ? 'text-ice' : 'text-gray-500 group-hover:text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium font-mono transition-colors ${active ? 'text-white' : 'text-gray-300'}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>

                  {/* Toggle indicator */}
                  <div className={`absolute bottom-3 right-3 w-7 h-4 rounded-full transition-all duration-200 ${
                    active ? 'bg-ice/30' : 'bg-ghost/50'
                  }`}>
                    <motion.div
                      animate={{ x: active ? 14 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-colors ${active ? 'bg-ice' : 'bg-gray-600'}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-void-surface border border-ghost/50 rounded-xl p-5">
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono block mb-3">Configuration</span>
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Normal Traffic Count</label>
              <input type="number" value={logCount} onChange={e => setLogCount(parseInt(e.target.value) || 0)}
                min={0} max={500} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Time Window (min)</label>
              <input type="number" value={timeWindow} onChange={e => setTimeWindow(parseInt(e.target.value) || 0)}
                min={5} max={120} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={runSimulation}
          disabled={loading || selected.length === 0}
          className={`w-full py-3.5 rounded-xl font-mono text-sm font-bold tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed ${
            loading
              ? 'bg-ice/20 text-ice border border-ice/30 animate-pulse'
              : selected.length === 0
                ? 'bg-void-surface border border-ghost text-gray-600'
                : 'reactor-btn'
          }`}
        >
          {loading ? 'EXECUTING SIMULATION...' : `LAUNCH SIMULATION (${selected.length} scenario${selected.length !== 1 ? 's' : ''})`}
        </motion.button>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="bg-sev-critical/10 border border-sev-critical/30 text-sev-critical px-4 py-2.5 rounded-xl text-xs font-mono">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-void-surface border border-ghost/50 rounded-xl overflow-hidden"
            >
              {/* Banner */}
              <div className="bg-green-500/10 border-b border-green-500/20 px-5 py-3 flex items-center gap-3">
                <div className="hex-dot bg-green-400" />
                <span className="text-sm font-display text-green-400 tracking-wider">◈ SIMULATION COMPLETE ◈</span>
                <span className="text-xs font-mono text-gray-500 ml-auto">
                  Total: <span className="text-white font-bold">{result.totalGenerated}</span> logs generated
                </span>
              </div>

              {/* Breakdown table */}
              <div className="divide-y divide-ghost/30">
                <div className="grid grid-cols-[1fr_120px] gap-0 px-5 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-[0.1em]">
                  <span>Scenario</span>
                  <span className="text-right">Logs</span>
                </div>
                {Object.entries(result.breakdown).map(([scenario, count], i) => {
                  const sc = SCENARIOS.find(s => s.key === scenario);
                  const Icon = sc?.icon || Activity;
                  return (
                    <motion.div
                      key={scenario}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      className="grid grid-cols-[1fr_120px] gap-0 px-5 py-2.5 items-center hover:bg-void-surface transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-mono text-gray-300">{sc?.label || scenario}</span>
                        {sc && <div className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[sc.sev]} opacity-60`} />}
                      </div>
                      <span className="text-right text-sm font-mono font-bold text-ice">{count}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="px-5 py-3 border-t border-ghost/30 flex gap-4">
                <Link to="/logs" className="flex items-center gap-1.5 text-xs font-mono text-ice hover:text-white transition-colors">
                  View in Logs <ArrowRight className="w-3 h-3" />
                </Link>
                <Link to="/alerts" className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors">
                  Wait for Alerts <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
