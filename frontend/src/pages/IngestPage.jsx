import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, CheckCircle2, XCircle, ChevronDown, Database } from 'lucide-react';
import HudFrame from '../components/HudFrame';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const TABS = ['JSON', 'CSV', 'Syslog'];
const TAB_COLORS = { JSON: '#f59e0b', CSV: '#14b8a6', Syslog: '#8b5cf6' };
const PLACEHOLDERS = {
  JSON: `[
  {
    "timestamp": "2026-01-15T10:30:00Z",
    "src_ip": "192.168.1.100",
    "event_type": "login_failed",
    "severity": "HIGH",
    "message": "Failed login attempt"
  }
]`,
  CSV: `timestamp,src_ip,dst_ip,event_type,severity,message
2026-01-15T10:30:00Z,192.168.1.100,10.0.0.1,login_failed,HIGH,Failed login`,
  Syslog: `<34>Mar 26 10:15:32 firewall01 sshd[2847]: Failed password for admin from 192.168.1.100 port 22`,
};

export default function IngestPage() {
  const [tab, setTab] = useState('JSON');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  };

  const ingestText = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const endpoint = tab === 'JSON' ? '/api/v1/ingest/json' : tab === 'CSV' ? '/api/v1/ingest/csv' : '/api/v1/ingest/syslog';
      const contentType = tab === 'JSON' ? 'application/json' : 'text/plain';
      const res = await api.post(endpoint, text, { headers: { 'Content-Type': contentType } });
      setResult(res.data);
      if (res.data.ingested > 0) { setFlash(true); setTimeout(() => setFlash(false), 1500); }
    } catch (err) { setResult({ format: tab, ingested: 0, failed: 1, errors: [err.message] }); }
    finally { setLoading(false); }
  };

  const uploadFile = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/v1/ingest/auto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      if (res.data.ingested > 0) { setFlash(true); setTimeout(() => setFlash(false), 1500); }
    } catch (err) { setResult({ format: 'unknown', ingested: 0, failed: 1, errors: [err.message] }); }
    finally { setLoading(false); }
  };

  const downloadSample = async (format) => {
    const res = await api.get(`/api/v1/ingest/sample/${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url;
    a.download = `securelens-sample.${format}`; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Database className="w-5 h-5 text-ice" />
            <h1 className="text-xl font-bold font-display tracking-tight" style={{ textShadow: '0 0 20px rgba(125,211,252,0.15)' }}>
              DATA INGESTION TERMINAL
            </h1>
          </div>
          <p className="text-gray-500 text-xs font-mono ml-8">
            Upload log files or paste raw log data. Supports JSON, CSV, and syslog with auto-normalization.
          </p>
        </div>

        {/* Drag-Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer ${
            dragOver
              ? 'border-ice bg-ice/[0.04] shadow-ice-glow'
              : 'border-ghost/50 hover:border-ghost'
          }`}
          style={dragOver ? {} : { animation: 'pulse-glow 4s ease-in-out infinite', '--glow-color': 'rgba(125,211,252,0.05)' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".json,.csv,.log,.txt"
            onChange={e => setFile(e.target.files?.[0] || null)} />

          {file ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <FileText className="w-10 h-10 text-ice mx-auto mb-3" />
              <p className="text-sm font-mono font-medium text-white">{file.name}</p>
              <p className="text-xs font-mono text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); uploadFile(); }}
                disabled={loading}
                className="mt-4 bg-ice text-void font-mono text-xs font-medium px-5 py-2 rounded-lg hover:shadow-ice-glow disabled:opacity-40 transition-all cursor-pointer"
              >
                {loading ? 'Uploading...' : 'Upload & Ingest'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
              <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-mono">Drop log files here or click to browse</p>
              <p className="text-[10px] text-gray-600 mt-1 font-mono">.json, .csv, .log, .txt</p>
            </motion.div>
          )}
        </div>

        {/* Manual Paste */}
        <div className="bg-void-surface border border-ghost/50 rounded-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-ghost/50">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setText(''); }}
                className={`relative px-5 py-2.5 text-xs font-mono transition-all cursor-pointer ${
                  tab === t ? 'text-white bg-void-surface' : 'text-gray-500 hover:text-gray-300 hover:bg-void-surface'
                }`}
              >
                {t}
                {tab === t && (
                  <motion.div
                    layoutId="ingest-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: TAB_COLORS[t] }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="p-4">
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={PLACEHOLDERS[tab]}
                rows={10}
                className="w-full bg-void border border-ghost/40 rounded-lg px-4 py-3 text-sm font-mono text-green-400/90 placeholder-gray-700 focus:outline-none focus:border-ice/30 focus:shadow-ice-glow transition-all resize-y"
                spellCheck="false"
              />
            </div>

            <div className="flex items-center gap-3 mt-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={ingestText}
                disabled={loading || !text.trim()}
                className="reactor-btn font-display text-xs font-semibold tracking-[0.1em] px-5 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Ingesting...' : 'INGEST'}
              </motion.button>
              <span className="text-[10px] font-mono text-gray-600">
                Format: <span style={{ color: TAB_COLORS[tab] }}>{tab}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`relative bg-void-surface border rounded-xl p-5 overflow-hidden transition-colors ${
                flash ? 'border-green-500/50' : 'border-ghost/50'
              }`}
            >
              {/* Success flash */}
              <AnimatePresence>
                {flash && (
                  <motion.div
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 bg-green-500/10 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 mb-2 relative z-10">
                {result.ingested > 0 && (
                  <span className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-bold">{result.ingested}</span> logs ingested
                  </span>
                )}
                {result.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-sev-critical bg-sev-critical/10 px-3 py-1.5 rounded-lg text-xs font-mono">
                    <XCircle className="w-3.5 h-3.5" />
                    <span className="font-bold">{result.failed}</span> failed
                  </span>
                )}
                <span className="text-[10px] font-mono text-gray-600">Format: {result.format}</span>
              </div>

              {result.errors?.length > 0 && (
                <div className="mt-3 relative z-10">
                  <button
                    onClick={() => setErrorsOpen(!errorsOpen)}
                    className="flex items-center gap-1 text-xs text-sev-critical font-mono cursor-pointer hover:text-red-400 transition-colors"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${errorsOpen ? '' : '-rotate-90'}`} />
                    View errors ({result.errors.length})
                  </button>
                  <AnimatePresence>
                    {errorsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <pre className="mt-2 text-xs text-red-400/80 bg-void rounded-lg p-3 font-mono border border-ghost/30 overflow-x-auto">
                          {result.errors.map((e, i) => <div key={i}>{'>'} {e}</div>)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {result.ingested > 0 && (
                <Link to="/logs" className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-ice hover:text-white transition-colors relative z-10">
                  View in Log Viewer <span className="text-gray-600">→</span>
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sample Downloads */}
        <div className="flex gap-3">
          {['csv', 'json'].map(fmt => (
            <motion.button
              key={fmt}
              whileTap={{ scale: 0.97 }}
              onClick={() => downloadSample(fmt)}
              className="flex items-center gap-1.5 text-xs font-mono text-gray-500 border border-ghost/50 px-3 py-1.5 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" /> Sample {fmt.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
