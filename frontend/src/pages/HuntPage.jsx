import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Plus, X, Save, Target, Play, AlertTriangle } from 'lucide-react';
import HudFrame from '../components/HudFrame';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const FIELDS = ['sourceIp', 'destinationIp', 'eventType', 'severity', 'userIdField', 'rawMessage'];
const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH'];
const GROUP_OPTIONS = ['', 'sourceIp', 'destinationIp', 'eventType', 'severity', 'userIdField'];
const SEVERITY_COLORS = {
  INFO: 'bg-void-surface text-gray-400 border border-ghost',
  LOW: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const inputClass = 'bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-ice/40 focus:ring-1 focus:ring-ice/20 transition-colors placeholder:text-white/20';
const selectClass = 'bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-ice/40 focus:ring-1 focus:ring-ice/20 transition-colors appearance-none cursor-pointer';

export default function HuntPage() {
  const [conditions, setConditions] = useState([{ field: 'sourceIp', operator: 'EQUALS', value: '' }]);
  const [groupBy, setGroupBy] = useState('');
  const [threshold, setThreshold] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedHunts, setSavedHunts] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [promoteForm, setPromoteForm] = useState(null);

  useEffect(() => { loadSavedHunts(); }, []);

  const loadSavedHunts = () => {
    api.get('/api/v1/hunts').then(r => setSavedHunts(r.data)).catch(() => {});
  };

  const buildQuery = () => ({
    conditions: conditions.filter(c => c.value),
    timeRange: { startDate: startDate ? new Date(startDate).toISOString() : null, endDate: endDate ? new Date(endDate).toISOString() : null },
    groupBy: groupBy || null,
    threshold: groupBy ? threshold : null,
  });

  const executeHunt = async () => {
    setLoading(true); setResult(null);
    try { const r = await api.post('/api/v1/hunts/execute', buildQuery()); setResult(r.data); }
    catch { setResult(null); }
    finally { setLoading(false); }
  };

  const saveHunt = async () => {
    if (!saveName) return;
    await api.post('/api/v1/hunts/save', { name: saveName, description: saveDesc, query: buildQuery() });
    setShowSave(false); setSaveName(''); setSaveDesc('');
    loadSavedHunts();
  };

  const loadHunt = (hunt) => {
    try {
      const q = JSON.parse(hunt.queryJson);
      if (q.conditions?.length) setConditions(q.conditions);
      setGroupBy(q.groupBy || '');
      setThreshold(q.threshold || 1);
    } catch {}
  };

  const runSaved = async (id) => {
    setLoading(true); setResult(null);
    try { const r = await api.post(`/api/v1/hunts/${id}/run`); setResult(r.data); }
    catch {} finally { setLoading(false); }
  };

  const promote = async () => {
    if (!promoteForm) return;
    await api.post('/api/v1/hunts/promote', promoteForm);
    setPromoteForm(null);
    alert('Alert created successfully');
  };

  const addCondition = () => setConditions([...conditions, { field: 'sourceIp', operator: 'EQUALS', value: '' }]);
  const removeCondition = (i) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i, key, val) => { const c = [...conditions]; c[i] = { ...c[i], [key]: val }; setConditions(c); };

  return (
    <div className="min-h-screen text-white intel-scanline intel-grid-bg relative">
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="intel-particle" style={{
          left: `${10 + i * 15}%`, top: `${5 + (i * 23) % 80}%`,
          '--duration': `${7 + i * 2}s`, '--delay': `${i * 1.2}s`
        }} />
      ))}

      <div className="flex p-6 gap-6 relative z-10">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="p-2 rounded-lg bg-ice/10 border border-ice/20">
              <Crosshair className="w-6 h-6 text-ice" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-wider"
                style={{ textShadow: '0 0 20px rgba(125,211,252,0.3)' }}>
              THREAT HUNTING
            </h1>
          </motion.div>

          {/* Query Builder */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
          >
            <h2 className="text-xs font-semibold text-ice/70 uppercase tracking-widest mb-4 font-display">
              Query Builder
            </h2>

            <AnimatePresence initial={false}>
              {conditions.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 mb-2 items-center"
                >
                  <select value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)}
                    className={selectClass}>
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={c.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}
                    className={selectClass}>
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input type="text" value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)}
                    placeholder="Value..." className={`${inputClass} flex-1`} />
                  {conditions.length > 1 && (
                    <button onClick={() => removeCondition(i)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <button onClick={addCondition}
              className="flex items-center gap-1.5 text-sm text-ice/60 hover:text-ice transition-colors mb-4 mt-1 font-mono">
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </button>

            <div className="flex gap-4 items-end flex-wrap mt-2">
              <div>
                <label className="block text-xs text-white/30 mb-1.5 font-mono uppercase tracking-wider">Start Date</label>
                <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className={inputClass} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1.5 font-mono uppercase tracking-wider">End Date</label>
                <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className={inputClass} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1.5 font-mono uppercase tracking-wider">Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  {GROUP_OPTIONS.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {groupBy && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <label className="block text-xs text-white/30 mb-1.5 font-mono uppercase tracking-wider">Min Count</label>
                  <input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 1)}
                    min={1} className={`${inputClass} w-20`} />
                </motion.div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={executeHunt}
                disabled={loading}
                className="flex items-center gap-2 reactor-btn font-display font-semibold tracking-[0.1em] px-5 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Target className="w-4 h-4" />
                {loading ? 'Hunting...' : 'Execute Hunt'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSave(!showSave)}
                className="flex items-center gap-2 border border-ghost text-white/70 px-4 py-2 rounded-lg text-sm hover:border-ice/30 hover:text-white transition-all font-mono"
              >
                <Save className="w-4 h-4" />
                Save Hunt
              </motion.button>
            </div>

            <AnimatePresence>
              {showSave && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex gap-2 items-end overflow-hidden"
                >
                  <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
                    placeholder="Hunt name" className={inputClass} />
                  <input type="text" value={saveDesc} onChange={e => setSaveDesc(e.target.value)}
                    placeholder="Description (optional)" className={`${inputClass} flex-1`} />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={saveHunt}
                    className="bg-ice/20 text-ice border border-ice/30 px-4 py-2 rounded-lg text-sm hover:bg-ice/30 transition-colors font-mono"
                  >
                    Save
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-void-surface border border-ghost rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3 flex justify-between items-center text-sm border-b border-ghost bg-void-surface">
                  <span className="font-mono text-ice">
                    {result.totalCount} <span className="text-white/40">results</span>
                  </span>
                  <span className="font-mono text-white/30">{result.executionTimeMs}ms</span>
                </div>

                {result.resultType === 'grouped' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ghost">
                        <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">{groupBy}</th>
                        <th className="px-4 py-3 text-right font-mono text-xs text-white/40 uppercase tracking-wider">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.groupedResults?.map((g, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-t border-ghost hover:bg-void-surface transition-colors"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-ice">{g.key}</td>
                          <td className="px-4 py-2.5 text-right font-bold font-mono text-white/80">{g.count}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {result.resultType === 'logs' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ghost">
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">Timestamp</th>
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">Source IP</th>
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">Event Type</th>
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">Severity</th>
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left font-mono text-xs text-white/40 uppercase tracking-wider">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.logs?.map((log, i) => (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-t border-ghost hover:bg-void-surface transition-colors"
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-white/60">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-ice">{log.sourceIp}</td>
                            <td className="px-4 py-2.5 text-white/70">{log.eventType}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-md ${SEVERITY_COLORS[log.severity] || ''}`}>
                                {log.severity}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-white/60">{log.userIdField}</td>
                            <td className="px-4 py-2.5 text-white/40 text-xs">{log.rawMessage?.substring(0, 60)}...</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Promote */}
                <div className="p-4 border-t border-ghost bg-void-surface">
                  {!promoteForm ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPromoteForm({ title: '', description: '', severity: 'MEDIUM', evidenceLogIds: result.logs?.slice(0, 10).map(l => l.id) || [] })}
                      className="flex items-center gap-2 text-sm text-orange-400/70 border border-orange-400/20 px-4 py-2 rounded-lg hover:border-orange-400/40 hover:text-orange-400 hover:bg-orange-400/5 transition-all font-mono"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Promote to Alert
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 items-end flex-wrap"
                    >
                      <input type="text" value={promoteForm.title} onChange={e => setPromoteForm({ ...promoteForm, title: e.target.value })}
                        placeholder="Alert title" className={inputClass} />
                      <select value={promoteForm.severity} onChange={e => setPromoteForm({ ...promoteForm, severity: e.target.value })}
                        className={selectClass}>
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={promote}
                        className="flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm hover:bg-orange-500/30 transition-colors font-mono"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Create Alert
                      </motion.button>
                      <button onClick={() => setPromoteForm(null)}
                        className="text-sm text-white/30 hover:text-white/60 transition-colors px-2 py-2">
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Saved Hunts Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-64 shrink-0"
        >
          <h2 className="text-xs font-semibold text-ice/70 uppercase tracking-widest mb-4 font-display">
            Saved Hunts
          </h2>
          {savedHunts.length === 0 && (
            <div className="text-center py-8">
              <Crosshair className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/20 font-mono">No saved hunts yet</p>
            </div>
          )}
          <div className="space-y-2">
            {savedHunts.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="bg-void-surface border border-ghost rounded-xl p-3 hover:border-ice/20 transition-all group"
              >
                <p className="text-sm font-medium text-white/90 font-mono">{h.name}</p>
                <p className="text-xs text-white/30 mt-0.5">{h.createdBy} · {new Date(h.createdAt).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => loadHunt(h)}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-ice transition-colors font-mono">
                    <Target className="w-3 h-3" /> Load
                  </button>
                  <button onClick={() => runSaved(h.id)}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-ice transition-colors font-mono">
                    <Play className="w-3 h-3" /> Run
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
