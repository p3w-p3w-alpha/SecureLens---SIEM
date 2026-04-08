import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Plus, ChevronDown } from 'lucide-react';
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
const STATUSES = ['OPEN', 'CONTAINED', 'ERADICATED', 'RECOVERED', 'CLOSED'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = () => api.get(`/api/v1/incidents/${id}`).then(r => { setIncident(r.data); setNewStatus(r.data.status); }).catch(() => {});

  useEffect(() => { load(); }, [id]);

  const updateStatus = async () => {
    await api.patch(`/api/v1/incidents/${id}/status`, { status: newStatus });
    load();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/api/v1/incidents/${id}/timeline`, { note });
    setNote('');
    load();
  };

  const downloadReport = async () => {
    setGenerating(true);
    try {
      const res = await api.get(`/api/v1/incidents/${id}/report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-${id}-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      load();
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  if (!incident) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-mono">Loading...</div>;

  const currentStatusIndex = STATUSES.indexOf(incident.status);

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto">
      <Link to="/incidents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ice transition-colors mb-5 font-mono">
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <h1 className="text-2xl font-bold font-display tracking-wide">{incident.title}</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEV_COLORS[incident.severity]}`}>{incident.severity}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[incident.status]}`}>{incident.status}</span>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
      >
        <p className="text-sm text-gray-300 mb-3">{incident.description || 'No description'}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 font-mono">
          <div>Created by: <span className="text-gray-400">{incident.createdBy}</span></div>
          <div>Created: <span className="text-gray-400">{new Date(incident.createdAt).toLocaleString()}</span></div>
        </div>
      </motion.div>

      {/* Status Lifecycle Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
      >
        <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display mb-4">Lifecycle Progress</h2>
        <div className="flex items-center justify-between px-2">
          {STATUSES.map((status, i) => (
            <div key={status} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < currentStatusIndex
                    ? 'bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                    : i === currentStatusIndex
                    ? 'bg-ice border-ice shadow-[0_0_8px_rgba(125,211,252,0.4)]'
                    : 'bg-transparent border-gray-600'
                }`} />
                <span className={`text-[10px] font-mono mt-1.5 ${
                  i < currentStatusIndex
                    ? 'text-green-400'
                    : i === currentStatusIndex
                    ? 'text-ice'
                    : 'text-gray-600'
                }`}>{status}</span>
              </div>
              {i < STATUSES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 mt-[-14px] ${
                  i < currentStatusIndex ? 'bg-green-500/60' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Status Update */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
      >
        <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display mb-3">Update Status</h2>
        <div className="flex gap-2 items-center">
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            className="bg-void-surface border border-ghost rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:border-ice/50 focus:outline-none transition-colors">
            {STATUSES.map(s => <option key={s} value={s} className="bg-void-surface text-white">{s}</option>)}
          </select>
          <button onClick={updateStatus} disabled={newStatus === incident.status}
            className="border border-ice text-ice px-4 py-1.5 rounded-lg text-sm font-mono hover:bg-ice/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
            Update
          </button>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
      >
        <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display mb-3">Timeline</h2>
        {incident.timeline?.length > 0 ? (
          <div className="relative ml-2 mb-4">
            <div className="absolute left-[5px] top-2 bottom-2 border-l-2 border-ghost" />
            <div className="space-y-4">
              {incident.timeline.map((entry, i) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-ice/80 border-2 border-void shadow-[0_0_6px_rgba(125,211,252,0.3)]" />
                  <p className="text-xs text-gray-500 font-mono">{entry.timestamp?.substring(0, 19)}
                    <span className="ml-2 text-ice/70 bg-ice/10 px-1.5 py-0.5 rounded text-[10px]">{entry.author}</span>
                  </p>
                  <p className="text-sm text-gray-300 mt-0.5">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-3 font-mono">No timeline entries yet</p>
        )}
        <div className="flex gap-2">
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..."
            className="flex-1 bg-void-surface border border-ghost rounded-lg px-3 py-1.5 text-sm text-white font-mono placeholder-gray-500 focus:border-ice/50 focus:outline-none transition-colors"
            onKeyDown={e => e.key === 'Enter' && addNote()} />
          <button onClick={addNote}
            className="flex items-center gap-1.5 border border-ice text-ice px-3 py-1.5 rounded-lg text-sm font-mono hover:bg-ice/10 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </motion.div>

      {/* Linked Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-void-surface border border-ghost rounded-xl p-5 mb-5"
      >
        <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display mb-3">
          Linked Alerts ({incident.linkedAlerts?.length || 0})
        </h2>
        {incident.linkedAlerts?.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-ghost">
            <table className="w-full text-sm">
              <thead className="bg-void-surface"><tr>
                <th className="px-3 py-2 text-left font-medium text-gray-400 font-mono text-xs uppercase tracking-wider">Rule</th>
                <th className="px-3 py-2 text-left font-medium text-gray-400 font-mono text-xs uppercase tracking-wider">Severity</th>
                <th className="px-3 py-2 text-left font-medium text-gray-400 font-mono text-xs uppercase tracking-wider">MITRE</th>
                <th className="px-3 py-2 text-left font-medium text-gray-400 font-mono text-xs uppercase tracking-wider">Source</th>
                <th className="px-3 py-2 text-left font-medium text-gray-400 font-mono text-xs uppercase tracking-wider">Status</th>
              </tr></thead>
              <tbody>
                {incident.linkedAlerts.map(a => (
                  <tr key={a.id} className="border-t border-ghost hover:bg-void-surface transition-colors">
                    <td className="px-3 py-2">
                      <Link to={`/alerts/${a.id}`} className="text-ice hover:text-cyan-300 transition-colors">{a.ruleName}</Link>
                    </td>
                    <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${SEV_COLORS[a.severity]}`}>{a.severity}</span></td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono text-ice/70 border border-ice/20 px-1.5 py-0.5 rounded">{a.mitreTactic}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-xs font-mono text-ice/70 border border-ice/20 px-1.5 py-0.5 rounded">{a.mitreTechnique}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">{a.sourceIp || a.userIdField || '-'}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || 'text-gray-400'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 font-mono">No linked alerts</p>
        )}
      </motion.div>

      {/* Generate Report */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-void-surface border border-ghost rounded-xl p-5"
      >
        <h2 className="text-xs font-semibold text-ice uppercase tracking-widest font-display mb-3">Report</h2>
        <button onClick={downloadReport} disabled={generating}
          className="flex items-center gap-2 bg-ice/10 border border-ice text-ice px-5 py-2.5 rounded-lg text-sm font-mono hover:bg-ice/20 transition-colors disabled:opacity-40 disabled:hover:bg-ice/10">
          <FileText className="w-4 h-4" />
          {generating ? 'Generating PDF...' : 'Generate PDF Report'}
        </button>
        {incident.reportGenerated && <p className="text-xs text-green-400 mt-2 font-mono">Report previously generated</p>}
      </motion.div>
    </div>
  );
}
