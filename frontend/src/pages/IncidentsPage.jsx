import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, X } from 'lucide-react';
import HudFrame from '../components/HudFrame';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const SEV_COLORS = {
  INFO: 'bg-sev-info/20 text-sev-info',
  LOW: 'bg-sev-low/20 text-sev-low',
  MEDIUM: 'bg-sev-medium/20 text-sev-medium',
  HIGH: 'bg-sev-high/20 text-sev-high',
  CRITICAL: 'bg-sev-critical/20 text-sev-critical',
};
const STATUS_COLORS = {
  OPEN: 'border border-sev-critical text-sev-critical',
  CONTAINED: 'border border-sev-high text-sev-high',
  ERADICATED: 'border border-sev-medium text-sev-medium',
  RECOVERED: 'border border-sev-low text-sev-low',
  CLOSED: 'border border-green-500 text-green-400',
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', severity: 'HIGH', alertIds: [] });

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = () => api.get('/api/v1/incidents').then(r => setIncidents(r.data)).catch(() => {});

  const loadAlerts = () => {
    api.get('/api/v1/alerts', { params: { size: 50 } }).then(r => setAlerts(r.data.content || [])).catch(() => {});
  };

  const openCreate = () => { setShowCreate(true); loadAlerts(); };

  const createIncident = async () => {
    if (!form.title) return;
    await api.post('/api/v1/incidents', form);
    setShowCreate(false);
    setForm({ title: '', description: '', severity: 'HIGH', alertIds: [] });
    loadIncidents();
  };

  const toggleAlert = (id) => {
    setForm(f => ({
      ...f,
      alertIds: f.alertIds.includes(id) ? f.alertIds.filter(a => a !== id) : [...f.alertIds, id]
    }));
  };

  return (
    <div className="min-h-screen text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-ice" />
          <h1 className="text-2xl font-bold font-display tracking-wider text-white">INCIDENT MANAGEMENT</h1>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 reactor-btn px-4 py-1.5 rounded-lg text-sm font-display font-semibold tracking-[0.1em]">
          <Plus className="w-4 h-4" />
          Create Incident
        </button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-void-surface border border-ghost rounded-xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display">New Incident</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Incident title"
              className="w-full bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:border-ice/50 focus:outline-none transition-colors" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description" rows={3}
              className="w-full bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:border-ice/50 focus:outline-none transition-colors" />
            <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
              className="bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-ice/50 focus:outline-none transition-colors">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s} className="bg-void-surface text-white">{s}</option>)}
            </select>
            {alerts.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-mono">Link Alerts:</p>
                <div className="max-h-40 overflow-y-auto border border-ghost rounded-lg p-2 space-y-1 bg-void-surface">
                  {alerts.filter(a => a.status !== 'RESOLVED').map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-void-surface p-1.5 rounded-lg transition-colors">
                      <input type="checkbox" checked={form.alertIds.includes(a.id)} onChange={() => toggleAlert(a.id)}
                        className="accent-ice" />
                      <span className={`text-xs px-1.5 py-0.5 rounded ${SEV_COLORS[a.severity]}`}>{a.severity}</span>
                      <span className="text-gray-300">{a.ruleName}</span>
                      <span className="text-xs text-gray-500 font-mono">{a.sourceIp || a.userIdField}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={createIncident}
                className="border border-ice text-ice px-4 py-1.5 rounded-lg text-sm font-mono hover:bg-ice/10 transition-colors">
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors font-mono">Cancel</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ MISSION BOARD — Card Grid (replaces table) ═══ */}
      {incidents.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-ghost mx-auto mb-3" strokeWidth={1} />
          <p className="font-display text-sm text-mist tracking-wider">NO ACTIVE MISSIONS</p>
          <div className="hex-dot bg-ice/30 mx-auto mt-3 animate-pulse" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {incidents.map((inc, i) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 150, damping: 18 }}
          >
            <Link to={`/incidents/${inc.id}`} className="block">
              <div className="void-card void-scan p-5 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display text-sm text-frost tracking-wide group-hover:text-ice transition-colors">{inc.title}</h3>
                  <div className="hex-dot shrink-0" style={{ background: SEV_COLORS[inc.severity]?.includes('critical') ? '#ef4444' : SEV_COLORS[inc.severity]?.includes('high') ? '#f97316' : '#eab308' }} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${SEV_COLORS[inc.severity]}`}>{inc.severity}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[inc.status]}`}>{inc.status}</span>
                  <span className="text-[10px] font-mono text-mist ml-auto">{inc.createdBy}</span>
                  <span className="text-[10px] font-mono text-ghost">{new Date(inc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
